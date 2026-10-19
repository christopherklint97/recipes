import { stat } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { isExportAuthorized } from "../../../../server/export-auth.ts";
import {
	getUploadDir,
	mimeForExt,
	sanitizeFilename,
} from "../../../../server/storage/images.ts";

/** Uploaded recipe images for the Familjen AB sync. Bearer RECIPES_EXPORT_TOKEN. */
export const Route = createFileRoute("/api/export/images/$name")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				if (!isExportAuthorized(request.headers.get("authorization"))) {
					return new Response("unauthorized", { status: 401 });
				}
				const safe = sanitizeFilename(params.name);
				if (!safe) return new Response("bad name", { status: 400 });
				const filePath = join(getUploadDir(), safe);
				const info = await stat(filePath).catch(() => null);
				if (!info?.isFile()) return new Response("not found", { status: 404 });
				const ext = safe.split(".").pop() ?? "";
				return new Response(Bun.file(filePath), {
					headers: { "Content-Type": mimeForExt(ext), "Cache-Control": "no-store" },
				});
			},
		},
	},
});
