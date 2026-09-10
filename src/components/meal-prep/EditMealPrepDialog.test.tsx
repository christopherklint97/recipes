// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditMealPrepDialog } from "./EditMealPrepDialog.tsx";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	createFileRoute: () => (options: object) => ({
		...options,
		useLoaderData: vi.fn(),
	}),
	getRouteApi: () => ({
		useLoaderData: () => ({ weekStartsOn: "sunday" as const }),
	}),
}));

vi.mock("../../server/functions/meal-preps.ts", () => ({
	deleteMealPrepFn: vi.fn(),
	getMealPrepFn: vi.fn(),
	removeManualMealPrepItemFn: vi.fn(),
	removeRecipeFromMealPrepFn: vi.fn(),
	setMealPrepRecipeServingsFn: vi.fn(),
	updateMealPrepFn: vi.fn(),
}));

vi.mock("./MealPrepProvider.tsx", () => ({
	useMealPrep: () => ({ openMealPrep: vi.fn() }),
}));

function TestProviders({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

afterEach(() => vi.clearAllMocks());

describe("EditMealPrepDialog", () => {
	it("resynchronizes fields from refreshed props when opened", () => {
		const { rerender } = render(
			<EditMealPrepDialog
				open={false}
				onOpenChange={() => undefined}
				mealPrep={{
					id: "plan-1",
					name: "Old plan",
					weekStart: "2026-08-02",
				}}
			/>,
			{ wrapper: TestProviders },
		);

		rerender(
			<EditMealPrepDialog
				open
				onOpenChange={() => undefined}
				mealPrep={{
					id: "plan-1",
					name: "Refreshed plan",
					weekStart: "2026-08-09",
				}}
			/>,
		);

		expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
			"Refreshed plan",
		);
		expect((screen.getByLabelText("Week") as HTMLInputElement).value).toBe(
			"2026-08-09",
		);
	});
});
