import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export const COOKIE_NAME = "recipes_session";
const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

export interface SessionPayload {
	u: string;
	iat: number;
}

function getSecret(): string {
	const secret = process.env.AUTH_SECRET;
	if (!secret || secret.length < 32) {
		throw new Error(
			"AUTH_SECRET must be set to a random string of at least 32 chars",
		);
	}
	return secret;
}

function b64urlEncode(buf: Buffer | Uint8Array): string {
	return Buffer.from(buf)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
	const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
	return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
	return b64urlEncode(
		createHmac("sha256", getSecret()).update(payload).digest(),
	);
}

export function signSession(username: string): string {
	const payload: SessionPayload = {
		u: username,
		iat: Math.floor(Date.now() / 1000),
	};
	const encoded = b64urlEncode(Buffer.from(JSON.stringify(payload)));
	return `${encoded}.${sign(encoded)}`;
}

export function verifySession(
	value: string | undefined | null,
): SessionPayload | null {
	if (!value) return null;
	const [encoded, signature] = value.split(".");
	if (!encoded || !signature) return null;
	const expected = sign(encoded);
	const a = Buffer.from(signature);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		const payload = JSON.parse(
			b64urlDecode(encoded).toString("utf8"),
		) as SessionPayload;
		if (typeof payload?.u !== "string" || typeof payload?.iat !== "number") {
			return null;
		}
		return payload;
	} catch {
		return null;
	}
}

export function getSession(): SessionPayload | null {
	return verifySession(getCookie(COOKIE_NAME));
}

export function setSessionCookie(value: string): void {
	setCookie(COOKIE_NAME, value, {
		maxAge: TEN_YEARS_SECONDS,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});
}

export function clearSessionCookie(): void {
	setCookie(COOKIE_NAME, "", {
		maxAge: 0,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
	});
}
