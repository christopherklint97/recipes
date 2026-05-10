import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../server/auth/session.ts";
import {
	extForMime,
	getUploadDir,
	MAX_IMAGE_BYTES,
} from "../../../server/storage/images.ts";

function jsonError(status: number, message: string): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const Route = createFileRoute("/api/upload/image")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!getSession()) return jsonError(401, "unauthorized");

				const form = await request.formData();
				const file = form.get("file");
				if (!(file instanceof File)) return jsonError(400, "file required");
				if (file.size === 0) return jsonError(400, "empty file");
				if (file.size > MAX_IMAGE_BYTES) {
					return jsonError(413, "file too large");
				}

				const ext = extForMime(file.type);
				if (!ext) return jsonError(415, "unsupported mime type");

				const filename = `${crypto.randomUUID()}.${ext}`;
				const dest = join(getUploadDir(), filename);
				await writeFile(dest, Buffer.from(await file.arrayBuffer()));

				return Response.json({ path: `/api/images/${filename}` });
			},
		},
	},
});
