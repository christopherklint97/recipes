import { describe, expect, it } from "vitest";
import { decodeHtmlText } from "./html-text.ts";

describe("decodeHtmlText", () => {
	it("decodes named, numeric, and repeatedly encoded entities", () => {
		expect(
			decodeHtmlText(
				"T&amp;auml;rna zucchini. R&amp;ouml;r om och tills&amp;auml;tt pur&amp;eacute;.",
			),
		).toBe("Tärna zucchini. Rör om och tillsätt puré.");
		expect(decodeHtmlText("Salt &amp; peppar &#228;")).toBe("Salt & peppar ä");
	});
});
