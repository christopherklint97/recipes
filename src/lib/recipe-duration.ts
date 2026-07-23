export interface RecipeDurationSource {
	prepMinutes?: number | null;
	cookMinutes?: number | null;
}

export const DURATION_FILTERS = [
	{ value: "0-15", label: "0–15 min", minExclusive: 0, maxInclusive: 15 },
	{ value: "15-30", label: "15–30 min", minExclusive: 15, maxInclusive: 30 },
	{ value: "30-45", label: "30–45 min", minExclusive: 30, maxInclusive: 45 },
	{ value: "45-60", label: "45–60 min", minExclusive: 45, maxInclusive: 60 },
	{ value: "60-75", label: "60–75 min", minExclusive: 60, maxInclusive: 75 },
	{ value: "75-90", label: "75–90 min", minExclusive: 75, maxInclusive: 90 },
	{ value: "90-105", label: "90–105 min", minExclusive: 90, maxInclusive: 105 },
	{
		value: "105-120",
		label: "105–120 min",
		minExclusive: 105,
		maxInclusive: 120,
	},
	{ value: "120+", label: "120+ min", minExclusive: 120, maxInclusive: null },
] as const;

export type DurationFilter = "all" | (typeof DURATION_FILTERS)[number]["value"];

export function matchesDurationFilter(
	recipe: RecipeDurationSource,
	filter: DurationFilter,
): boolean {
	if (filter === "all") return true;
	const total = totalRecipeMinutes(recipe);
	if (total === null) return false;
	const range = DURATION_FILTERS.find(
		(candidate) => candidate.value === filter,
	);
	if (!range) return true;
	return (
		total > range.minExclusive &&
		(range.maxInclusive === null || total <= range.maxInclusive)
	);
}

export function totalRecipeMinutes({
	prepMinutes,
	cookMinutes,
}: RecipeDurationSource): number | null {
	const total = Math.max(0, prepMinutes ?? 0) + Math.max(0, cookMinutes ?? 0);
	return total > 0 ? total : null;
}

export function formatRecipeDuration(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const hours = Math.floor(total / 60);
	const remainingMinutes = total % 60;
	if (hours === 0) return `${remainingMinutes} min`;
	if (remainingMinutes === 0) return `${hours} hr`;
	return `${hours} hr ${remainingMinutes} min`;
}
