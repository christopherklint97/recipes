import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CalendarDays,
	ChefHat,
	Pencil,
	Plus,
	ShoppingCart,
	Trash2,
	Utensils,
} from "lucide-react";
import { useState } from "react";
import { AddToMealPrepDialog } from "../../components/meal-prep/AddToMealPrepDialog.tsx";
import {
	ManualMealItemDialog,
	type ManualMealItemValue,
} from "../../components/meal-prep/ManualMealItemDialog.tsx";
import { useMealPrep } from "../../components/meal-prep/MealPrepProvider.tsx";
import { Button } from "../../components/ui/button.tsx";
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

async function loadCurrentWeek() {
	const weekStart = weekStartFromOffset();
	const plans = (await listMealPrepsFn()).filter(
		(plan) => plan.weekStart === weekStart,
	);
	const details = await Promise.all(
		plans.map((plan) => getMealPrepFn({ data: { id: plan.id } })),
	);
	return { weekStart, plans: details.filter((plan) => plan !== null) };
}

export const Route = createFileRoute("/_app/week")({
	loader: loadCurrentWeek,
	component: CurrentWeekPage,
});

function CurrentWeekPage() {
	const initial = Route.useLoaderData();
	const qc = useQueryClient();
	const { openMealPrep } = useMealPrep();
	const [createOpen, setCreateOpen] = useState(false);
	const [manualPlan, setManualPlan] = useState<{
		id: string;
		name: string;
		item?: ManualMealItemValue;
	} | null>(null);
	const { data = initial } = useQuery({
		queryKey: ["current-week", initial.weekStart],
		queryFn: loadCurrentWeek,
		initialData: initial,
	});
	const recipes = data.plans.flatMap((plan) => plan.recipes);
	const manualItems = data.plans.flatMap((plan) => plan.manualItems);
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
					<h1 className="text-3xl font-semibold tracking-tight">This week</h1>
					<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
						<CalendarDays className="size-4" /> {formatWeek(data.weekStart)} ·{" "}
						{formatWeekRange(data.weekStart)}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{recipes.length > 0 && (
						<Button onClick={() => openMealPrep(recipes)}>
							<ShoppingCart className="size-4" /> Shop for recipes
						</Button>
					)}
					<Button variant="outline" onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" /> New plan
					</Button>
				</div>
			</header>

			{data.plans.length === 0 ? (
				<div className="rounded-2xl border border-dashed bg-card/50 px-6 py-14 text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
						<Utensils className="size-6 text-muted-foreground" />
					</div>
					<h2 className="text-lg font-semibold">Nothing planned yet</h2>
					<p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
						Create this week’s plan, then add saved recipes or quick one-off
						food entries.
					</p>
					<Button className="mt-5" onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" /> Plan this week
					</Button>
				</div>
			) : (
				<div className="space-y-8">
					<div className="grid grid-cols-3 gap-2 rounded-2xl border bg-card p-3 text-center shadow-sm">
						<Summary value={data.plans.length} label="plans" />
						<Summary value={recipes.length} label="recipes" />
						<Summary value={manualItems.length} label="quick items" />
					</div>
					{data.plans.map((plan) => (
						<section
							key={plan.id}
							className="space-y-3"
							aria-labelledby={`plan-${plan.id}`}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<h2 id={`plan-${plan.id}`} className="text-xl font-semibold">
										{plan.name}
									</h2>
									<Link
										to="/meal-prep/$id"
										params={{ id: plan.id }}
										className="text-xs text-muted-foreground hover:text-foreground"
									>
										Open and edit plan
									</Link>
								</div>
								<div className="flex gap-2">
									<Button asChild variant="outline" size="sm">
										<Link to="/recipes">
											<ChefHat className="size-4" /> Add recipe
										</Link>
									</Button>
									<Button
										size="sm"
										onClick={() =>
											setManualPlan({ id: plan.id, name: plan.name })
										}
									>
										<Plus className="size-4" /> Quick item
									</Button>
								</div>
							</div>
							{plan.recipes.length === 0 && plan.manualItems.length === 0 ? (
								<p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
									This plan is empty. Add a recipe or a quick item.
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
											<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
												<Utensils className="size-5 text-primary" />
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="font-semibold">{item.title}</h3>
												{(item.amount || item.note) && (
													<p className="text-xs text-muted-foreground">
														{[item.amount, item.note]
															.filter(Boolean)
															.join(" · ")}
													</p>
												)}
												<p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
													Quick item
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
			<AddToMealPrepDialog open={createOpen} onOpenChange={setCreateOpen} />
			{manualPlan && (
				<ManualMealItemDialog
					mealPrepId={manualPlan.id}
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
