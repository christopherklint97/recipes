import { describe, expect, it } from "vitest";
import { parseIngredientLine, parseQuantity } from "./ingredients.ts";

describe("parseQuantity", () => {
	it.each([
		["1 1/2", 1.5],
		["1/2", 0.5],
		["1½", 1.5],
		["2,5", 2.5],
	])("parses %s as %s", (input, expected) => {
		expect(parseQuantity(input)).toBe(expected);
	});

	it("does not treat an unfinished mixed fraction as two whole numbers", () => {
		expect(parseQuantity("1 1")).toBeNull();
	});
});

describe("parseIngredientLine", () => {
	it.each([
		["1 1/2 msk olivolja", 1.5, "tbsp", "olivolja"],
		["2 tsk salt", 2, "tsp", "salt"],
		["1 dl vispgrädde", 100, "ml", "vispgrädde"],
		["2 cl citronsaft", 20, "ml", "citronsaft"],
		["1 hg smör", 100, "g", "smör"],
		["3 st. ägg", 3, "pcs", "ägg"],
		["1 krm svartpeppar", 1, "ml", "svartpeppar"],
	])("normalizes Swedish ingredient %s", (line, quantity, unit, name) => {
		expect(parseIngredientLine(line)).toEqual({
			quantity,
			unit,
			name,
			note: null,
		});
	});
});
