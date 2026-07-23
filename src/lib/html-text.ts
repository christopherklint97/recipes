import { decodeHTML } from "entities";

/** Decode HTML entities, including text that was encoded more than once. */
export function decodeHtmlText(value: string): string {
	let decoded = value;
	for (let pass = 0; pass < 3; pass += 1) {
		const next = decodeHTML(decoded);
		if (next === decoded) break;
		decoded = next;
	}
	return decoded.replace(/\u00a0/g, " ");
}
