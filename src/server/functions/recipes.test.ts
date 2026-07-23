import { describe, expect, it } from "vitest";
import { createRecipeInput } from "./recipes.ts";

const recipe = {
	title: "Test recipe",
	sourceType: "manual" as const,
	servings: 4,
};

describe("createRecipeInput", () => {
	it("requires at least one collection for every new recipe", () => {
		expect(
			createRecipeInput.safeParse({ ...recipe, collectionIds: [] }).success,
		).toBe(false);
		expect(
			createRecipeInput.safeParse({
				...recipe,
				collectionIds: ["collection-1"],
			}).success,
		).toBe(true);
	});
});
