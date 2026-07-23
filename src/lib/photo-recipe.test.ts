import { describe, expect, it } from "vitest";
import { parsePhotoRecipeText } from "./photo-recipe.ts";

describe("parsePhotoRecipeText", () => {
	it("turns Swedish OCR text into editable recipe fields", () => {
		const parsed = parsePhotoRecipeText(`Laxgryta med tomat
Cirka 20 min. 650 kcal
INGREDIENSER GÖR SÅ HÄR
6 portioner
500 g laxfilé 1. Tina fisken.
400 g torskfilé
2 1/2 dl vispgrädde 2. Koka upp grädden.
1 msk majsstärkelse
3. Lägg i fisken och sjud i 5 minuter.
Servera med ris.`);

		expect(parsed.title).toBe("Laxgryta med tomat");
		expect(parsed.servings).toBe(6);
		expect(parsed.cookMinutes).toBe(20);
		expect(parsed.caloriesPerServing).toBe(650);
		expect(parsed.ingredients).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "laxfilé", quantity: 500, unit: "g" }),
				expect.objectContaining({
					name: "vispgrädde",
					quantity: 250,
					unit: "ml",
				}),
				expect.objectContaining({
					name: "majsstärkelse",
					quantity: 1,
					unit: "tbsp",
				}),
			]),
		);
		expect(parsed.instructions.map((step) => step.text)).toEqual([
			"Tina fisken.",
			"Koka upp grädden.",
			"Lägg i fisken och sjud i 5 minuter.",
			"Servera med ris.",
		]);
	});
});
