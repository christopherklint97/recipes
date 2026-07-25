import { describe, expect, it } from "vitest";
import {
	manualMealPrepItemInput,
	reorderCollectionsInput,
} from "./validation.ts";

describe("planning validation", () => {
	it("accepts a flexible manual food entry", () => {
		expect(
			manualMealPrepItemInput.safeParse({
				mealPrepId: "prep-1",
				title: "Greek yoghurt",
				amount: "500 g",
				note: "Breakfast",
			}).success,
		).toBe(true);
	});

	it("rejects blank manual entries and duplicate collection ids", () => {
		expect(
			manualMealPrepItemInput.safeParse({ mealPrepId: "prep-1", title: "  " })
				.success,
		).toBe(false);
		expect(
			reorderCollectionsInput.safeParse({ ids: ["one", "one"] }).success,
		).toBe(false);
	});
});
