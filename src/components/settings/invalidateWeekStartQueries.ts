import type { QueryClient } from "@tanstack/react-query";

export async function invalidateWeekStartQueries(
	queryClient: Pick<QueryClient, "invalidateQueries">,
	invalidateRouter: () => unknown,
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: ["current-week"] }),
		queryClient.invalidateQueries({ queryKey: ["meal-preps"] }),
		queryClient.invalidateQueries({ queryKey: ["meal-prep"] }),
		invalidateRouter(),
	]);
}
