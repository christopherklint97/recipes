import { createMiddleware } from "@tanstack/react-start";
import { getSession, type SessionPayload } from "./session.ts";

export class UnauthorizedError extends Error {
	constructor() {
		super("Unauthorized");
		this.name = "UnauthorizedError";
	}
}

export const authedMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const session: SessionPayload | null = getSession();
		if (!session) {
			throw new UnauthorizedError();
		}
		return next({ context: { session } });
	},
);
