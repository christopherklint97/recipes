import { afterEach, describe, expect, it, vi } from "vitest";
import { scrapeRecipeFromUrl } from "./jsonld.ts";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("scrapeRecipeFromUrl instruction text", () => {
	it("fully decodes repeatedly encoded Swedish HTML entities", async () => {
		const recipe = {
			"@context": "https://schema.org",
			"@type": "Recipe",
			name: "One pot pasta",
			recipeYield: "4 portioner",
			recipeIngredient: ["1 zucchini"],
			recipeInstructions: [
				{
					"@type": "HowToStep",
					text: "T&amp;auml;rna zucchini. R&amp;ouml;r om och tills&amp;auml;tt pur&amp;eacute;.",
				},
			],
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(
						`<script type="application/ld+json">${JSON.stringify(recipe)}</script>`,
						{ status: 200 },
					),
			),
		);

		const result = await scrapeRecipeFromUrl("https://example.com/recipe");

		expect(result.instructions[0]?.text).toBe(
			"Tärna zucchini. Rör om och tillsätt puré.",
		);
	});
});
