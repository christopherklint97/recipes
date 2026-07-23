import { describe, expect, it } from "vitest";
import { resolveImportedDurations } from "./duration.ts";

describe("resolveImportedDurations", () => {
	it("keeps separate prep and cook times so their total can be displayed", () => {
		expect(resolveImportedDurations("PT15M", "PT45M", "PT1H")).toEqual({
			prepMinutes: 15,
			cookMinutes: 45,
		});
	});

	it("imports total time when a recipe only supplies totalTime", () => {
		expect(resolveImportedDurations(undefined, undefined, "PT1H30M")).toEqual({
			prepMinutes: null,
			cookMinutes: 90,
		});
	});

	it("infers a missing cook time from totalTime", () => {
		expect(resolveImportedDurations("PT20M", undefined, "PT1H")).toEqual({
			prepMinutes: 20,
			cookMinutes: 40,
		});
	});

	it("infers a missing prep time from totalTime", () => {
		expect(resolveImportedDurations(undefined, "PT40M", "PT1H")).toEqual({
			prepMinutes: 20,
			cookMinutes: 40,
		});
	});
});
