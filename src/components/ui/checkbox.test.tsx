// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox.tsx";

describe("Checkbox", () => {
	it("uses block layout so padded wrappers stay square", () => {
		render(
			<div className="p-1 leading-6">
				<Checkbox aria-label="Mark recipe cooked" />
			</div>,
		);

		expect(
			screen.getByRole("checkbox", { name: "Mark recipe cooked" }).classList,
		).toContain("block");
	});
});
