import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	formatWeek,
	formatWeekRange,
	normalizeToWeekStart,
	weekStartFromOffset,
} from "../../lib/week.ts";
import { addRecipesToWeekFn } from "../../server/functions/meal-preps.ts";
import { Button } from "../ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";

export type MealPrepCandidate = {
	id: string;
	title: string;
	servings?: number;
};

export function AddToMealPrepDialog({
	open,
	onOpenChange,
	recipes,
	defaultWeekStart,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipes: MealPrepCandidate[];
	defaultWeekStart?: string;
}) {
	const qc = useQueryClient();
	const [weekStart, setWeekStart] = useState(
		defaultWeekStart ?? weekStartFromOffset(),
	);
	const recipeIds = useMemo(
		() => recipes.map((recipe) => recipe.id),
		[recipes],
	);

	useEffect(() => {
		if (open) setWeekStart(defaultWeekStart ?? weekStartFromOffset());
	}, [open, defaultWeekStart]);

	const add = useMutation({
		mutationFn: () =>
			addRecipesToWeekFn({
				data: {
					weekStart,
					recipeIds,
					servingsByRecipe: Object.fromEntries(
						recipes.flatMap((recipe) =>
							typeof recipe.servings === "number"
								? [[recipe.id, recipe.servings]]
								: [],
						),
					),
				},
			}),
		onSuccess: async ({ id }) => {
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["meal-preps"] }),
				qc.invalidateQueries({ queryKey: ["current-week"] }),
				qc.invalidateQueries({ queryKey: ["meal-prep", id] }),
			]);
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Add to weekly plan</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="rounded-xl bg-muted p-3 text-sm">
						<div className="flex items-center gap-2 font-medium">
							<CalendarDays className="size-4" />
							{recipes.length} recipe{recipes.length === 1 ? "" : "s"} selected
						</div>
						<p className="mt-1 text-muted-foreground">
							If this week has no plan yet, one will be created automatically.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="meal-plan-week">Week</Label>
						<div className="flex flex-wrap gap-2">
							{[
								["This week", 0],
								["Next week", 1],
								["In two weeks", 2],
							].map(([label, offset]) => {
								const value = weekStartFromOffset(Number(offset));
								return (
									<Button
										key={label}
										type="button"
										size="sm"
										variant={weekStart === value ? "secondary" : "outline"}
										onClick={() => setWeekStart(value)}
									>
										{label}
									</Button>
								);
							})}
						</div>
						<Input
							id="meal-plan-week"
							type="date"
							value={weekStart}
							onChange={(event) =>
								setWeekStart(normalizeToWeekStart(event.target.value))
							}
						/>
						<p className="text-xs text-muted-foreground">
							{formatWeek(weekStart)} · {formatWeekRange(weekStart)}
						</p>
					</div>
					{add.isError && (
						<p role="alert" className="text-sm text-destructive">
							Could not update the weekly plan. Please try again.
						</p>
					)}
				</div>
				<DialogFooter>
					<Button
						onClick={() => add.mutate()}
						disabled={recipes.length === 0 || add.isPending}
					>
						{add.isPending ? "Adding…" : "Add to week"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
