import { describe, expect, it } from "vitest";
import { formatGoogleKeepChecklist } from "./shopping-clipboard.ts";

describe("formatGoogleKeepChecklist", () => {
	it("creates one clean line per Google Keep checklist item", () => {
		expect(
			formatGoogleKeepChecklist([
				"2 kg potatoes",
				" Milk & cream ",
				"Fresh\nbasil",
				"",
			]),
		).toBe("2 kg potatoes\nMilk & cream\nFresh basil");
	});
});
