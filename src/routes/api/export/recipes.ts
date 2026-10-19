import { createFileRoute } from "@tanstack/react-router";
import { isExportAuthorized } from "../../../server/export-auth.ts";
import { exportRecipes } from "../../../server/export.server.ts";

/** Full recipe collection as JSON for Familjen AB. Bearer RECIPES_EXPORT_TOKEN. */
export const Route = createFileRoute("/api/export/recipes")({
	server: {
		handlers: {
			GET: ({ request }) => {
				if (!isExportAuthorized(request.headers.get("authorization"))) {
					return new Response("unauthorized", { status: 401 });
				}
				return Response.json(
					{ version: 1, exportedAt: new Date().toISOString(), recipes: exportRecipes() },
					{ headers: { "Cache-Control": "no-store" } },
				);
			},
		},
	},
});
