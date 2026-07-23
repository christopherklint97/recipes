import { describe, expect, it } from "vitest";
import {
	formatRecipeDuration,
	matchesDurationFilter,
	totalRecipeMinutes,
} from "./recipe-duration.ts";

describe("totalRecipeMinutes", () => {
	it("combines prep and cook time", () => {
		expect(totalRecipeMinutes({ prepMinutes: 15, cookMinutes: 45 })).toBe(60);
	});

	it("uses whichever duration is available", () => {
		expect(totalRecipeMinutes({ prepMinutes: null, cookMinutes: 35 })).toBe(35);
		expect(totalRecipeMinutes({ prepMinutes: 20, cookMinutes: null })).toBe(20);
	});

	it("returns null when no positive duration exists", () => {
		expect(
			totalRecipeMinutes({ prepMinutes: null, cookMinutes: null }),
		).toBeNull();
	});
});

describe("formatRecipeDuration", () => {
	it.each([
		[35, "35 min"],
		[60, "1 hr"],
		[90, "1 hr 30 min"],
		[135, "2 hr 15 min"],
	])("formats %s minutes as %s", (minutes, expected) => {
		expect(formatRecipeDuration(minutes)).toBe(expected);
	});
});

describe("matchesDurationFilter", () => {
	it("uses non-overlapping 15-minute ranges", () => {
		expect(
			matchesDurationFilter({ prepMinutes: 5, cookMinutes: 10 }, "0-15"),
		).toBe(true);
		expect(
			matchesDurationFilter({ prepMinutes: 5, cookMinutes: 10 }, "15-30"),
		).toBe(false);
		expect(
			matchesDurationFilter({ prepMinutes: 15, cookMinutes: 15 }, "15-30"),
		).toBe(true);
		expect(
			matchesDurationFilter({ prepMinutes: 60, cookMinutes: 61 }, "120+"),
		).toBe(true);
	});
});
