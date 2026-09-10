// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AddToMealPrepDialog } from "./AddToMealPrepDialog.tsx";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-router")>()),
	getRouteApi: () => ({
		useLoaderData: () => ({ weekStartsOn: "sunday" as const }),
	}),
}));

vi.mock("../../server/functions/meal-preps.ts", () => ({
	addRecipesToWeekFn: vi.fn(),
}));

function TestProviders({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={new QueryClient()}>
			{children}
		</QueryClientProvider>
	);
}

describe("AddToMealPrepDialog", () => {
	it("normalizes a stale default to the configured week start", () => {
		render(
			<AddToMealPrepDialog
				open
				onOpenChange={() => undefined}
				recipes={[{ id: "recipe-1", title: "Soup" }]}
				defaultWeekStart="2026-08-03"
			/>,
			{ wrapper: TestProviders },
		);

		expect((screen.getByLabelText("Week") as HTMLInputElement).value).toBe(
			"2026-08-02",
		);
	});
});
