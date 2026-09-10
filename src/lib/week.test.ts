import { describe, expect, it } from "vitest";
import {
	formatWeek,
	isWeekStart,
	normalizeToWeekStart,
	shiftWeekStart,
	weekStartDelta,
	weekStartFromOffset,
} from "./week.ts";

describe("configurable week starts", () => {
	it("accepts the configured first day and rejects other or invalid dates", () => {
		expect(isWeekStart("2026-08-02", "sunday")).toBe(true);
		expect(isWeekStart("2026-08-03", "sunday")).toBe(false);
		expect(isWeekStart("2026-08-03", "monday")).toBe(true);
		expect(isWeekStart("2026-08-02", "monday")).toBe(false);
		expect(isWeekStart("2026-02-30", "sunday")).toBe(false);
	});

	it("finds a Sunday-start week", () => {
		const wednesday = new Date(2026, 7, 5, 12);
		expect(weekStartFromOffset(0, wednesday, "sunday")).toBe("2026-08-02");
		expect(weekStartFromOffset(1, wednesday, "sunday")).toBe("2026-08-09");
	});

	it("finds a Monday-start week", () => {
		const sunday = new Date(2026, 7, 2, 12);
		expect(weekStartFromOffset(0, sunday, "monday")).toBe("2026-07-27");
		expect(weekStartFromOffset(1, sunday, "monday")).toBe("2026-08-03");
	});

	it("normalizes selected dates to the configured week start", () => {
		expect(normalizeToWeekStart("2026-08-05", "sunday")).toBe("2026-08-02");
		expect(normalizeToWeekStart("2026-08-05", "monday")).toBe("2026-08-03");
	});

	it("calculates how stored weeks move when the setting changes", () => {
		expect(weekStartDelta("monday", "sunday")).toBe(-1);
		expect(weekStartDelta("sunday", "monday")).toBe(1);
		expect(weekStartDelta("sunday", "sunday")).toBe(0);
	});

	it("keeps the same calendar week label for Sunday and Monday starts", () => {
		expect(formatWeek("2026-09-06")).toBe("Week 37, 2026");
		expect(formatWeek("2026-09-07")).toBe("Week 37, 2026");
	});

	it("moves between represented weeks without losing the selected first day", () => {
		expect(shiftWeekStart("2026-12-27", 1)).toBe("2027-01-03");
		expect(shiftWeekStart("2027-01-03", -1)).toBe("2026-12-27");
	});
});
