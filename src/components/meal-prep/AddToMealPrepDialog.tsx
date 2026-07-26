import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	formatWeek,
	formatWeekRange,
	normalizeToWeekStart,
	weekStartFromOffset,
} from "../../lib/week.ts";
import {
	addRecipesToMealPrepFn,
	createMealPrepFn,
	listMealPrepsFn,
} from "../../server/functions/meal-preps.ts";
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
};

export function AddToMealPrepDialog({
	open,
	onOpenChange,
	recipes = [],
	defaultWeekStart,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipes?: MealPrepCandidate[];
	defaultWeekStart?: string;
}) {
	const qc = useQueryClient();
	const router = useRouter();
	const [mode, setMode] = useState<"existing" | "new">("new");
	const [selectedId, setSelectedId] = useState("");
	const [name, setName] = useState("");
	const [weekStart, setWeekStart] = useState(weekStartFromOffset());
	const { data: mealPreps = [] } = useQuery({
		queryKey: ["meal-preps"],
		queryFn: () => listMealPrepsFn(),
		enabled: open,
	});
	const recipeIds = useMemo(
		() => recipes.map((recipe) => recipe.id),
		[recipes],
	);

	useEffect(() => {
		if (open && defaultWeekStart) setWeekStart(defaultWeekStart);
	}, [open, defaultWeekStart]);

	useEffect(() => {
		if (!open || recipes.length === 0 || mealPreps.length === 0) return;
		setMode("existing");
		const currentWeek = mealPreps.find(
			(mealPrep) => mealPrep.weekStart === weekStartFromOffset(),
		);
		setSelectedId((current) => current || currentWeek?.id || mealPreps[0].id);
	}, [open, recipes.length, mealPreps]);

	const create = useMutation({
		mutationFn: () =>
			createMealPrepFn({
				data: { name, weekStart, recipeIds },
			}),
		onSuccess: async ({ id }) => {
			await qc.invalidateQueries({ queryKey: ["meal-preps"] });
			await qc.invalidateQueries({ queryKey: ["current-week"] });
			onOpenChange(false);
			setName("");
			await router.navigate({ to: "/meal-prep/$id", params: { id } });
		},
	});
	const add = useMutation({
		mutationFn: () =>
			addRecipesToMealPrepFn({
				data: { mealPrepId: selectedId, recipeIds },
			}),
		onSuccess: async ({ id }) => {
			await qc.invalidateQueries({ queryKey: ["meal-preps"] });
			await qc.invalidateQueries({ queryKey: ["current-week"] });
			await qc.invalidateQueries({ queryKey: ["meal-prep", id] });
			onOpenChange(false);
			await router.navigate({ to: "/meal-prep/$id", params: { id } });
		},
	});
	const todayLabel = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date());
	const pending = create.isPending || add.isPending;
	const error = create.isError || add.isError;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{recipes.length > 0 ? "Add to meal prep" : "New meal prep"}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-xl bg-muted p-3 text-sm">
						<div className="flex items-center gap-2 font-medium">
							<CalendarDays className="size-4" />
							Today is {todayLabel}
						</div>
						{recipes.length > 0 && (
							<p className="mt-1 text-muted-foreground">
								{recipes.length} recipe{recipes.length === 1 ? "" : "s"}{" "}
								selected
							</p>
						)}
					</div>

					{recipes.length > 0 && mealPreps.length > 0 && (
						<div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
							<Button
								type="button"
								variant={mode === "existing" ? "secondary" : "ghost"}
								onClick={() => setMode("existing")}
							>
								Existing list
							</Button>
							<Button
								type="button"
								variant={mode === "new" ? "secondary" : "ghost"}
								onClick={() => setMode("new")}
							>
								<Plus className="size-4" /> New list
							</Button>
						</div>
					)}

					{mode === "existing" && recipes.length > 0 && mealPreps.length > 0 ? (
						<div className="max-h-72 space-y-2 overflow-auto">
							{mealPreps.map((mealPrep) => (
								<button
									key={mealPrep.id}
									type="button"
									onClick={() => setSelectedId(mealPrep.id)}
									className={`w-full rounded-xl border p-3 text-left transition ${selectedId === mealPrep.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
								>
									<p className="font-medium">{mealPrep.name}</p>
									<p className="text-xs text-muted-foreground">
										{formatWeek(mealPrep.weekStart)} · {mealPrep.recipeCount}{" "}
										recipe{mealPrep.recipeCount === 1 ? "" : "s"}
									</p>
								</button>
							))}
						</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="meal-prep-name">Name</Label>
								<Input
									id="meal-prep-name"
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder="Family dinners"
									autoFocus
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="meal-prep-week">Week</Label>
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
									id="meal-prep-week"
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
						</div>
					)}

					{error && (
						<p role="alert" className="text-sm text-destructive">
							Could not save the meal prep. Please try again.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						onClick={() =>
							mode === "existing" && mealPreps.length > 0
								? add.mutate()
								: create.mutate()
						}
						disabled={
							pending ||
							(mode === "existing" && mealPreps.length > 0
								? !selectedId
								: !name.trim())
						}
					>
						{pending
							? "Saving…"
							: mode === "existing" && mealPreps.length > 0
								? "Add recipes"
								: "Create meal prep"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
