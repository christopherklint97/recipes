import { describe, expect, it } from "vitest";
import { isExportAuthorized } from "./export-auth.ts";

const token = "x".repeat(40);

describe("isExportAuthorized", () => {
	it("accepts only the exact bearer token", () => {
		expect(isExportAuthorized(`Bearer ${token}`, token)).toBe(true);
		expect(isExportAuthorized(`Bearer ${token}y`, token)).toBe(false);
		expect(isExportAuthorized(token, token)).toBe(false);
		expect(isExportAuthorized(null, token)).toBe(false);
	});

	it("is disabled without a sufficiently long token", () => {
		expect(isExportAuthorized("Bearer short", "short")).toBe(false);
		expect(isExportAuthorized(`Bearer ${token}`, undefined)).toBe(false);
	});
});
