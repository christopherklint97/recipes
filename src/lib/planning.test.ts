import { describe, expect, it } from "vitest";
import {
	aggregateRecipeServings,
	literalLikeSubstring,
	summarizeDishes,
} from "./planning.ts";

describe("summarizeDishes", () => {
	it("combines recipes and quick items in both totals", () => {
		expect(
			summarizeDishes([{ servings: 4 }], [{ servings: 2 }, { servings: 6 }]),
		).toEqual({ dishes: 3, servings: 12 });
	});
});

describe("aggregateRecipeServings", () => {
	it("adds servings for a recipe present in several plans", () => {
		expect(
			aggregateRecipeServings([
				{ id: "a", title: "Soup", servings: 2 },
				{ id: "b", title: "Salad", servings: 3 },
				{ id: "a", title: "Soup", servings: 4 },
			]),
		).toEqual([
			{ id: "a", title: "Soup", servings: 6 },
			{ id: "b", title: "Salad", servings: 3 },
		]);
	});
});

describe("literalLikeSubstring", () => {
	it.each([
		["broccoli", "%broccoli%"],
		["100%", "%100\\%%"],
		["a_b", "%a\\_b%"],
		["a\\b", "%a\\\\b%"],
	])("escapes %s for a literal LIKE search", (query, pattern) => {
		expect(literalLikeSubstring(query)).toBe(pattern);
	});
});
