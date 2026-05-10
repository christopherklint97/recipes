import { createServerFn } from "@tanstack/react-start";
import { getSession, type SessionPayload } from "./session.ts";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
	(): SessionPayload | null => getSession(),
);
