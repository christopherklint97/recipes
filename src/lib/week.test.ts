import { describe, expect, it } from "vitest";
import {
	isIsoWeekStart,
	normalizeToWeekStart,
	shiftWeekStart,
} from "./week.ts";

describe("ISO week starts", () => {
	it("accepts only valid Mondays", () => {
		expect(isIsoWeekStart("2026-07-27")).toBe(true);
		expect(isIsoWeekStart("2026-07-28")).toBe(false);
		expect(isIsoWeekStart("2026-02-30")).toBe(false);
	});

	it("normalizes dates to their Monday", () => {
		expect(normalizeToWeekStart("2026-08-02")).toBe("2026-07-27");
		expect(normalizeToWeekStart("2026-08-03")).toBe("2026-08-03");
	});

	it("moves between represented weeks without losing the ISO Monday", () => {
		expect(shiftWeekStart("2026-12-28", 1)).toBe("2027-01-04");
		expect(shiftWeekStart("2027-01-04", -1)).toBe("2026-12-28");
	});
});
