// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeForm, type RecipeFormValues } from "./RecipeForm.tsx";

describe("RecipeForm ingredients", () => {
	it("lets users edit imported ingredient quantity, unit, and name", async () => {
		const onSubmit = vi.fn<(values: RecipeFormValues) => void>();
		render(
			<RecipeForm
				submitLabel="Save changes"
				defaultValues={{
					title: "Imported recipe",
					ingredients: [
						{
							quantity: 1,
							unit: "tbsp",
							name: "oil",
							note: "",
							groupName: "",
						},
					],
				}}
				onSubmit={onSubmit}
			/>,
		);

		const quantityInput = screen.getByLabelText(
			"Quantity for oil",
		) as HTMLInputElement;
		for (const value of ["1 ", "1 1", "1 1/"]) {
			fireEvent.change(quantityInput, { target: { value } });
			expect(quantityInput.value).toBe(value);
		}
		fireEvent.change(quantityInput, { target: { value: "1 1/2" } });
		expect(quantityInput.value).toBe("1.5");
		fireEvent.change(screen.getByLabelText("Unit for oil"), {
			target: { value: "tsp" },
		});
		fireEvent.change(screen.getByLabelText("Ingredient name 1"), {
			target: { value: "olive oil" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
		expect(onSubmit.mock.calls[0][0].ingredients[0]).toMatchObject({
			quantity: 1.5,
			unit: "tsp",
			name: "olive oil",
		});
	});
});
