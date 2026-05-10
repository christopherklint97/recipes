import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../server/auth/session.ts";
import {
	getUploadDir,
	mimeForExt,
	sanitizeFilename,
} from "../../../server/storage/images.ts";

export const Route = createFileRoute("/api/images/$name")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!getSession()) return new Response("unauthorized", { status: 401 });

				const safe = sanitizeFilename(params.name);
				if (!safe) return new Response("bad name", { status: 400 });

				const filePath = join(getUploadDir(), safe);
				let info: Awaited<ReturnType<typeof stat>>;
				try {
					info = await stat(filePath);
				} catch {
					return new Response("not found", { status: 404 });
				}
				if (!info.isFile()) return new Response("not found", { status: 404 });

				const ext = safe.split(".").pop() ?? "";
				const stream = createReadStream(filePath);
				return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
					headers: {
						"Content-Type": mimeForExt(ext),
						"Content-Length": String(info.size),
						"Cache-Control": "private, max-age=31536000, immutable",
					},
				});
			},
		},
	},
});
