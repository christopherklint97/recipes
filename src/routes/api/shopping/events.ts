import { createFileRoute } from "@tanstack/react-router";
import { getSession } from "../../../server/auth/session.ts";
import { subscribeToShoppingChanges } from "../../../server/shopping-events.ts";

export const Route = createFileRoute("/api/shopping/events")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!getSession()) return new Response("unauthorized", { status: 401 });

				const encoder = new TextEncoder();
				let cleanup = () => {};
				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(encoder.encode(": connected\n\n"));
						const unsubscribe = subscribeToShoppingChanges(() => {
							controller.enqueue(encoder.encode("data: changed\n\n"));
						});
						const heartbeat = setInterval(() => {
							controller.enqueue(encoder.encode(": keep-alive\n\n"));
						}, 20_000);
						cleanup = () => {
							unsubscribe();
							clearInterval(heartbeat);
						};
						request.signal.addEventListener("abort", cleanup, { once: true });
					},
					cancel() {
						cleanup();
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache, no-transform",
						Connection: "keep-alive",
						"X-Accel-Buffering": "no",
					},
				});
			},
		},
	},
});
