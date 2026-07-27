import { describe, expect, it } from "vitest";
import { isIsoWeekStart, normalizeToWeekStart } from "./week.ts";

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
});
