import { describe, expect, it } from "vitest";
import { formatScaledQuantity, scaleQuantity } from "./servings.ts";

describe("serving quantity scaling", () => {
	it("scales quantities from the recipe base servings", () => {
		expect(scaleQuantity(1.5, 4, 6)).toBe(2.25);
		expect(scaleQuantity(null, 4, 6)).toBeNull();
	});

	it("formats common fractions without noisy decimals", () => {
		expect(formatScaledQuantity(0.5)).toBe("½");
		expect(formatScaledQuantity(1.25)).toBe("1¼");
		expect(formatScaledQuantity(2.333333)).toBe("2⅓");
		expect(formatScaledQuantity(2.2)).toBe("2.2");
	});
});
