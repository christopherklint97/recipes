import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CalendarDays,
	ChefHat,
	ChevronLeft,
	ChevronRight,
	Pencil,
	Plus,
	ShoppingCart,
	Trash2,
	Utensils,
} from "lucide-react";
import { useState } from "react";
import {
	ManualMealItemDialog,
	type ManualMealItemValue,
} from "../../components/meal-prep/ManualMealItemDialog.tsx";
import { useMealPrep } from "../../components/meal-prep/MealPrepProvider.tsx";
import { Button } from "../../components/ui/button.tsx";
import { summarizeDishes } from "../../lib/planning.ts";
import {
	formatWeek,
	formatWeekRange,
	weekStartFromOffset,
} from "../../lib/week.ts";
import {
	getMealPrepFn,
	listMealPrepsFn,
	removeManualMealPrepItemFn,
} from "../../server/functions/meal-preps.ts";

async function loadWeek(offset = 0) {
	const weekStart = weekStartFromOffset(offset);
	const plans = (await listMealPrepsFn()).filter(
		(plan) => plan.weekStart === weekStart,
	);
	const details = await Promise.all(
		plans.map((plan) => getMealPrepFn({ data: { id: plan.id } })),
	);
	return { weekStart, plans: details.filter((plan) => plan !== null) };
}

export const Route = createFileRoute("/_app/week")({
	loader: () => loadWeek(),
	component: CurrentWeekPage,
});

function CurrentWeekPage() {
	const initial = Route.useLoaderData();
	const qc = useQueryClient();
	const { openMealPrep } = useMealPrep();
	const [weekOffset, setWeekOffset] = useState(0);
	const [manualPlan, setManualPlan] = useState<{
		id?: string;
		weekStart?: string;
		name: string;
		item?: ManualMealItemValue;
	} | null>(null);
	const selectedWeekStart = weekStartFromOffset(weekOffset);
	const { data = { weekStart: selectedWeekStart, plans: [] }, isPending } =
		useQuery({
			queryKey: ["current-week", selectedWeekStart],
			queryFn: () => loadWeek(weekOffset),
			initialData: weekOffset === 0 ? initial : undefined,
		});
	const recipes = data.plans.flatMap((plan) => plan.recipes);
	const manualItems = data.plans.flatMap((plan) => plan.manualItems);
	const summary = summarizeDishes(recipes, manualItems);
	const weekTitle =
		weekOffset === 0
			? "This week"
			: weekOffset === 1
				? "Next week"
				: weekOffset === -1
					? "Last week"
					: formatWeek(data.weekStart);
	const removeManual = useMutation({
		mutationFn: (id: string) => removeManualMealPrepItemFn({ data: { id } }),
		onSuccess: () =>
			Promise.all([
				qc.invalidateQueries({ queryKey: ["current-week"] }),
				qc.invalidateQueries({ queryKey: ["meal-preps"] }),
			]),
	});

	return (
		<div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
						Your plan
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">{weekTitle}</h1>
					<div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							onClick={() => setWeekOffset((offset) => offset - 1)}
							aria-label="Show previous week"
						>
							<ChevronLeft className="size-4" />
						</Button>
						<p className="flex items-center gap-1.5">
							<CalendarDays className="size-4" /> {formatWeek(data.weekStart)} ·{" "}
							{formatWeekRange(data.weekStart)}
						</p>
						<Button
							variant="ghost"
							size="icon"
							className="size-9"
							onClick={() => setWeekOffset((offset) => offset + 1)}
							aria-label="Show next week"
						>
							<ChevronRight className="size-4" />
						</Button>
						{weekOffset !== 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setWeekOffset(0)}
							>
								Today
							</Button>
						)}
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{recipes.length > 0 && (
						<Button onClick={() => openMealPrep(recipes)}>
							<ShoppingCart className="size-4" /> Shop for recipes
						</Button>
					)}
				</div>
			</header>

			{isPending ? (
				<div className="rounded-2xl border bg-card/50 px-6 py-14 text-center text-sm text-muted-foreground">
					Loading week…
				</div>
			) : data.plans.length === 0 ? (
				<div className="rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
						<Utensils className="size-6 text-muted-foreground" />
					</div>
					<h2 className="text-lg font-semibold">Nothing planned yet</h2>
					<p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
						Add a saved recipe or quick meal. The weekly plan will be created
						automatically.
					</p>
					<div className="mt-5 flex flex-wrap justify-center gap-2">
						<Button asChild>
							<Link to="/recipes" search={{ weekStart: data.weekStart }}>
								<ChefHat className="size-4" /> Add recipe
							</Link>
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								setManualPlan({
									weekStart: data.weekStart,
									name: formatWeek(data.weekStart),
								})
							}
						>
							<Plus className="size-4" /> Quick meal
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-8">
					<div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 text-center shadow-sm">
						<Summary value={summary.dishes} label="dishes" />
						<Summary value={summary.servings} label="servings" />
					</div>
					{data.plans.map((plan) => (
						<section key={plan.id} className="space-y-3">
							<div className="flex flex-wrap items-center justify-end gap-2">
								<div className="flex gap-2">
									<Button asChild variant="outline" size="sm">
										<Link to="/recipes" search={{ weekStart: data.weekStart }}>
											<ChefHat className="size-4" /> Add recipe
										</Link>
									</Button>
									<Button
										size="sm"
										onClick={() =>
											setManualPlan({
												id: plan.id,
												name: formatWeek(plan.weekStart),
											})
										}
									>
										<Plus className="size-4" /> Quick meal
									</Button>
								</div>
							</div>
							{plan.recipes.length === 0 && plan.manualItems.length === 0 ? (
								<p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
									This plan is empty. Add a recipe or a quick meal.
								</p>
							) : (
								<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{plan.recipes.map((recipe) => (
										<li
											key={`recipe-${recipe.id}`}
											className="overflow-hidden rounded-2xl border bg-card shadow-sm"
										>
											<Link
												to="/recipes/$id"
												params={{ id: recipe.id }}
												search={{ servings: recipe.servings }}
												className="flex h-full items-center gap-3 p-3"
											>
												{recipe.heroImage ? (
													<img
														src={recipe.heroImage}
														alt=""
														className="size-16 shrink-0 rounded-xl object-cover"
													/>
												) : (
													<div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
														<ChefHat className="size-5 text-muted-foreground" />
													</div>
												)}
												<div className="min-w-0">
													<h3 className="line-clamp-2 font-semibold leading-snug">
														{recipe.title}
													</h3>
													<p className="mt-1 text-xs text-muted-foreground">
														{recipe.servings} serving
														{recipe.servings === 1 ? "" : "s"} · Recipe
													</p>
												</div>
											</Link>
										</li>
									))}
									{plan.manualItems.map((item) => (
										<li
											key={`manual-${item.id}`}
											className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
										>
											{item.image ? (
												<img
													src={item.image}
													alt=""
													className="size-12 shrink-0 rounded-xl object-cover"
												/>
											) : (
												<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
													<Utensils className="size-5 text-primary" />
												</div>
											)}
											<div className="min-w-0 flex-1">
												<h3 className="font-semibold">{item.title}</h3>
												<p className="text-xs text-muted-foreground">
													{item.servings} serving
													{item.servings === 1 ? "" : "s"}
													{(item.amount || item.note) && (
														<>
															{" · "}
															{[item.amount, item.note]
																.filter(Boolean)
																.join(" · ")}
														</>
													)}
												</p>
												<p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
													Quick meal
												</p>
											</div>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="size-11 sm:size-9"
													onClick={() =>
														setManualPlan({
															id: plan.id,
															name: plan.name,
															item,
														})
													}
													aria-label={`Edit ${item.title}`}
												>
													<Pencil className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="size-11 sm:size-9"
													onClick={() => removeManual.mutate(item.id)}
													disabled={removeManual.isPending}
													aria-label={`Remove ${item.title}`}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</li>
									))}
								</ul>
							)}
						</section>
					))}
				</div>
			)}
			{manualPlan && (
				<ManualMealItemDialog
					mealPrepId={manualPlan.id}
					weekStart={manualPlan.weekStart}
					mealPrepName={manualPlan.name}
					item={manualPlan.item}
					open={true}
					onOpenChange={(open) => {
						if (!open) setManualPlan(null);
					}}
				/>
			)}
		</div>
	);
}

function Summary({ value, label }: { value: number; label: string }) {
	return (
		<div>
			<p className="text-xl font-semibold tabular-nums">{value}</p>
			<p className="text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}
