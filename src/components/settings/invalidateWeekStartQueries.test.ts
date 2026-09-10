import { describe, expect, it, vi } from "vitest";
import { invalidateWeekStartQueries } from "./invalidateWeekStartQueries.ts";

describe("invalidateWeekStartQueries", () => {
	it("invalidates every singular meal-prep cache after shifting weeks", async () => {
		const invalidateQueries = vi.fn(async () => undefined);
		const invalidateRouter = vi.fn(async () => undefined);

		await invalidateWeekStartQueries(
			{ invalidateQueries } as never,
			invalidateRouter,
		);

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["meal-prep"],
		});
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["meal-preps"],
		});
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["current-week"],
		});
		expect(invalidateRouter).toHaveBeenCalledOnce();
	});
});
