import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Bearer-token check for the read-only export API used by Familjen AB.
 * Disabled (always false) unless RECIPES_EXPORT_TOKEN is set (min 32 chars).
 */
export function isExportAuthorized(
	header: string | null,
	token = process.env.RECIPES_EXPORT_TOKEN,
): boolean {
	if (!token || token.length < 32 || !header?.startsWith("Bearer ")) return false;
	const given = createHash("sha256").update(header.slice(7)).digest();
	const expected = createHash("sha256").update(token).digest();
	return timingSafeEqual(given, expected);
}
