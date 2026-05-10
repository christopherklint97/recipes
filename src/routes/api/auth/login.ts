import { createFileRoute } from "@tanstack/react-router";
import { verifyCredentials } from "../../../server/auth/credentials.ts";
import { setSessionCookie, signSession } from "../../../server/auth/session.ts";

export const Route = createFileRoute("/api/auth/login")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const form = await request.formData();
				const username = String(form.get("username") ?? "");
				const password = String(form.get("password") ?? "");

				const ok = await verifyCredentials(username, password);
				if (!ok) {
					return new Response(JSON.stringify({ ok: false }), {
						status: 401,
						headers: { "Content-Type": "application/json" },
					});
				}

				setSessionCookie(signSession(username));
				return new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
