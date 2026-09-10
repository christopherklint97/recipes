// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WeekStartSetting } from "./WeekStartSetting.tsx";

afterEach(cleanup);

describe("WeekStartSetting", () => {
	it("displays Sunday and Monday with Sunday selected", () => {
		render(
			<WeekStartSetting
				value="sunday"
				onChange={() => undefined}
				saving={false}
			/>,
		);

		const select = screen.getByRole("combobox", {
			name: "Start of week",
		}) as HTMLSelectElement;
		expect(select.value).toBe("sunday");
		expect(screen.getByRole("option", { name: "Sunday" })).toBeTruthy();
		expect(screen.getByRole("option", { name: "Monday" })).toBeTruthy();
	});

	it("reports a changed first day", () => {
		const onChange = vi.fn();
		render(
			<WeekStartSetting value="sunday" onChange={onChange} saving={false} />,
		);

		fireEvent.change(screen.getByRole("combobox", { name: "Start of week" }), {
			target: { value: "monday" },
		});
		expect(onChange).toHaveBeenCalledWith("monday");
	});
});
