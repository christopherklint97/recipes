import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUp,
	CalendarDays,
	Check,
	ChefHat,
	ChevronLeft,
	ChevronRight,
	GripVertical,
	Pencil,
	Plus,
	ShoppingCart,
	Trash2,
	Utensils,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
	ManualMealItemDialog,
	type ManualMealItemValue,
} from "../../components/meal-prep/ManualMealItemDialog.tsx";
import { useMealPrep } from "../../components/meal-prep/MealPrepProvider.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import { summarizeDishes } from "../../lib/planning.ts";
import {
	formatWeek,
	formatWeekRange,
	isIsoWeekStart,
	shiftWeekStart,
	weekStartFromOffset,
} from "../../lib/week.ts";
import {
	getMealPrepFn,
	listMealPrepsFn,
	removeManualMealPrepItemFn,
	removeRecipeFromMealPrepFn,
	reorderMealPrepItemsFn,
	setMealPrepItemCookedFn,
} from "../../server/functions/meal-preps.ts";

async function loadWeek(weekStart = weekStartFromOffset()) {
	const plans = (await listMealPrepsFn()).filter(
		(plan) => plan.weekStart === weekStart,
	);
	const details = await Promise.all(
		plans.map((plan) => getMealPrepFn({ data: { id: plan.id } })),
	);
	return { weekStart, plans: details.filter((plan) => plan !== null) };
}

type WeekData = Awaited<ReturnType<typeof loadWeek>>;
type WeekPlan = WeekData["plans"][number];
type PlanOrderItem = { type: "recipe" | "manual"; id: string };
type OrderedPlanItem =
	| {
			type: "recipe";
			id: string;
			position: number | null;
			value: WeekPlan["recipes"][number];
	  }
	| {
			type: "manual";
			id: string;
			position: number | null;
			value: WeekPlan["manualItems"][number];
	  };

function orderedPlanItems(plan: WeekPlan): OrderedPlanItem[] {
	const items: OrderedPlanItem[] = [
		...plan.recipes.map((value) => ({
			type: "recipe" as const,
			id: value.id,
			position: value.position,
			value,
		})),
		...plan.manualItems.map((value) => ({
			type: "manual" as const,
			id: value.id,
			position: value.position,
			value,
		})),
	];
	if (items.every((item) => item.position === null)) return items;
	return items.toSorted((a, b) => {
		if (a.position === null) return b.position === null ? 0 : -1;
		if (b.position === null) return 1;
		return a.position - b.position;
	});
}

export const Route = createFileRoute("/_app/week")({
	validateSearch: z.object({ weekStart: z.string().optional() }),
	loader: () => loadWeek(),
	component: CurrentWeekPage,
});

function CurrentWeekPage() {
	const initial = Route.useLoaderData();
	const { weekStart: requestedWeekStart } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const qc = useQueryClient();
	const { openMealPrep } = useMealPrep();
	const [editingOrder, setEditingOrder] = useState(false);
	const [manualPlan, setManualPlan] = useState<{
		id?: string;
		weekStart?: string;
		name: string;
		item?: ManualMealItemValue;
	} | null>(null);
	const currentWeekStart = weekStartFromOffset();
	const selectedWeekStart =
		requestedWeekStart && isIsoWeekStart(requestedWeekStart)
			? requestedWeekStart
			: currentWeekStart;
	const { data = { weekStart: selectedWeekStart, plans: [] }, isPending } =
		useQuery({
			queryKey: ["current-week", selectedWeekStart],
			queryFn: () => loadWeek(selectedWeekStart),
			initialData:
				selectedWeekStart === initial.weekStart ? initial : undefined,
		});
	const recipes = data.plans.flatMap((plan) => plan.recipes);
	const manualItems = data.plans.flatMap((plan) => plan.manualItems);
	const summary = summarizeDishes(recipes, manualItems);
	const weekTitle =
		selectedWeekStart === currentWeekStart
			? "This week"
			: selectedWeekStart === shiftWeekStart(currentWeekStart, 1)
				? "Next week"
				: selectedWeekStart === shiftWeekStart(currentWeekStart, -1)
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
	const removeRecipe = useMutation({
		mutationFn: ({
			mealPrepId,
			recipeId,
		}: {
			mealPrepId: string;
			recipeId: string;
		}) => removeRecipeFromMealPrepFn({ data: { mealPrepId, recipeId } }),
		onSuccess: (_result, { mealPrepId }) =>
			Promise.all([
				qc.invalidateQueries({ queryKey: ["current-week"] }),
				qc.invalidateQueries({ queryKey: ["meal-prep", mealPrepId] }),
				qc.invalidateQueries({ queryKey: ["meal-preps"] }),
			]),
	});
	const weekQueryKey = ["current-week", selectedWeekStart] as const;
	const reorder = useMutation({
		mutationFn: ({
			mealPrepId,
			items,
		}: {
			mealPrepId: string;
			items: PlanOrderItem[];
		}) => reorderMealPrepItemsFn({ data: { mealPrepId, items } }),
		onMutate: async ({ mealPrepId, items }) => {
			await qc.cancelQueries({ queryKey: weekQueryKey });
			const previous = qc.getQueryData<WeekData>(weekQueryKey);
			const positions = new Map(
				items.map((item, position) => [`${item.type}:${item.id}`, position]),
			);
			qc.setQueryData<WeekData>(weekQueryKey, (current) =>
				current
					? {
							...current,
							plans: current.plans.map((plan) =>
								plan.id === mealPrepId
									? {
											...plan,
											recipes: plan.recipes.map((recipe) => ({
												...recipe,
												position: positions.get(`recipe:${recipe.id}`) ?? null,
											})),
											manualItems: plan.manualItems.map((item) => ({
												...item,
												position: positions.get(`manual:${item.id}`) ?? null,
											})),
										}
									: plan,
							),
						}
					: current,
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) qc.setQueryData(weekQueryKey, context.previous);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: weekQueryKey }),
	});
	const cooked = useMutation({
		mutationFn: (variables: {
			mealPrepId: string;
			type: "recipe" | "manual";
			id: string;
			cooked: boolean;
		}) => setMealPrepItemCookedFn({ data: variables }),
		onMutate: async (variables) => {
			await qc.cancelQueries({ queryKey: weekQueryKey });
			const previous = qc.getQueryData<WeekData>(weekQueryKey);
			qc.setQueryData<WeekData>(weekQueryKey, (current) =>
				current
					? {
							...current,
							plans: current.plans.map((plan) =>
								plan.id !== variables.mealPrepId
									? plan
									: {
											...plan,
											recipes: plan.recipes.map((recipe) =>
												variables.type === "recipe" &&
												recipe.id === variables.id
													? { ...recipe, cooked: variables.cooked }
													: recipe,
											),
											manualItems: plan.manualItems.map((item) =>
												variables.type === "manual" && item.id === variables.id
													? { ...item, cooked: variables.cooked }
													: item,
											),
										},
							),
						}
					: current,
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) qc.setQueryData(weekQueryKey, context.previous);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: weekQueryKey }),
	});

	function moveItem(plan: WeekPlan, index: number, direction: -1 | 1) {
		const items = orderedPlanItems(plan).map(({ type, id }) => ({ type, id }));
		const target = index + direction;
		if (target < 0 || target >= items.length || reorder.isPending) return;
		[items[index], items[target]] = [items[target], items[index]];
		reorder.mutate({ mealPrepId: plan.id, items });
	}

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
							onClick={() =>
								void navigate({
									search: { weekStart: shiftWeekStart(selectedWeekStart, -1) },
								})
							}
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
							onClick={() =>
								void navigate({
									search: { weekStart: shiftWeekStart(selectedWeekStart, 1) },
								})
							}
							aria-label="Show next week"
						>
							<ChevronRight className="size-4" />
						</Button>
						{selectedWeekStart !== currentWeekStart && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => void navigate({ search: {} })}
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
					{data.plans.map((plan) => {
						const items = orderedPlanItems(plan);
						return (
							<section key={plan.id} className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									{items.length > 1 ? (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setEditingOrder((editing) => !editing)}
											aria-pressed={editingOrder}
										>
											{editingOrder ? (
												<Check className="size-4" />
											) : (
												<Pencil className="size-4" />
											)}
											{editingOrder ? "Done" : "Edit order"}
										</Button>
									) : (
										<span />
									)}
									<div className="flex gap-2">
										<Button asChild variant="outline" size="sm">
											<Link
												to="/recipes"
												search={{ weekStart: data.weekStart }}
											>
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
								{editingOrder && items.length > 1 && (
									<p className="flex items-center gap-2 text-sm text-muted-foreground">
										<GripVertical className="size-4 shrink-0" /> Use the arrows
										to set the order.
									</p>
								)}
								{reorder.isError && (
									<p role="alert" className="text-sm text-destructive">
										Could not save the new order. Please try again.
									</p>
								)}
								{items.length === 0 ? (
									<p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
										This plan is empty. Add a recipe or a quick meal.
									</p>
								) : (
									<WeekPlanItems
										items={items}
										weekStart={data.weekStart}
										weekTitle={weekTitle}
										editingOrder={editingOrder}
										orderPending={reorder.isPending}
										onMove={(index, direction) =>
											moveItem(plan, index, direction)
										}
										onCooked={(type, id, value) =>
											cooked.mutate({
												mealPrepId: plan.id,
												type,
												id,
												cooked: value,
											})
										}
										onEditManual={(item) =>
											setManualPlan({ id: plan.id, name: plan.name, item })
										}
										onRemoveManual={(id) => removeManual.mutate(id)}
										onRemoveRecipe={(recipeId) =>
											removeRecipe.mutate({ mealPrepId: plan.id, recipeId })
										}
										removeManualPending={removeManual.isPending}
										removeRecipePending={removeRecipe.isPending}
									/>
								)}
							</section>
						);
					})}
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

function WeekPlanItems({
	items,
	weekStart,
	weekTitle,
	editingOrder,
	orderPending,
	onMove,
	onCooked,
	onEditManual,
	onRemoveManual,
	onRemoveRecipe,
	removeManualPending,
	removeRecipePending,
}: {
	items: OrderedPlanItem[];
	weekStart: string;
	weekTitle: string;
	editingOrder: boolean;
	orderPending: boolean;
	onMove: (index: number, direction: -1 | 1) => void;
	onCooked: (type: "recipe" | "manual", id: string, cooked: boolean) => void;
	onEditManual: (item: ManualMealItemValue) => void;
	onRemoveManual: (id: string) => void;
	onRemoveRecipe: (id: string) => void;
	removeManualPending: boolean;
	removeRecipePending: boolean;
}) {
	return (
		<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((orderedItem, index) => {
				if (orderedItem.type === "recipe") {
					const recipe = orderedItem.value;
					return (
						<li
							key={`recipe-${recipe.id}`}
							className="relative flex items-center overflow-hidden rounded-2xl border bg-card shadow-sm"
						>
							<div className="absolute left-5 top-5 z-10 rounded bg-background/90 p-1 shadow-sm">
								<Checkbox
									checked={recipe.cooked}
									onCheckedChange={(checked) =>
										onCooked("recipe", recipe.id, checked === true)
									}
									aria-label={`Mark ${recipe.title} ${recipe.cooked ? "not cooked" : "cooked"}`}
								/>
							</div>
							<Link
								to="/recipes/$id"
								params={{ id: recipe.id }}
								search={{ servings: recipe.servings, fromWeek: weekStart }}
								className="flex min-w-0 flex-1 items-center gap-3 p-3"
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
									<h3
										className={`line-clamp-2 font-semibold leading-snug ${recipe.cooked ? "text-muted-foreground line-through" : ""}`}
									>
										{recipe.title}
									</h3>
									<p className="mt-1 text-xs text-muted-foreground">
										{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}{" "}
										· Recipe
									</p>
								</div>
							</Link>
							<div className="flex shrink-0 gap-1 pr-2">
								{editingOrder ? (
									<OrderButtons
										index={index}
										length={items.length}
										pending={orderPending}
										onMove={(direction) => onMove(index, direction)}
										label={recipe.title}
									/>
								) : (
									<>
										<Button
											asChild
											variant="ghost"
											size="icon"
											className="size-11 sm:size-9"
										>
											<Link
												to="/recipes/$id/edit"
												params={{ id: recipe.id }}
												search={{ fromWeek: weekStart }}
												aria-label={`Edit ${recipe.title}`}
											>
												<Pencil className="size-4" />
											</Link>
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="size-11 sm:size-9"
											onClick={() => {
												if (
													confirm(
														`Remove ${recipe.title} from ${weekTitle.toLowerCase()}?`,
													)
												) {
													onRemoveRecipe(recipe.id);
												}
											}}
											disabled={removeRecipePending}
											aria-label={`Remove ${recipe.title}`}
										>
											<Trash2 className="size-4" />
										</Button>
									</>
								)}
							</div>
						</li>
					);
				}

				const item = orderedItem.value;
				return (
					<li
						key={`manual-${item.id}`}
						className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
					>
						<Checkbox
							checked={item.cooked}
							onCheckedChange={(checked) =>
								onCooked("manual", item.id, checked === true)
							}
							aria-label={`Mark ${item.title} ${item.cooked ? "not cooked" : "cooked"}`}
						/>
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
							<h3
								className={`font-semibold ${item.cooked ? "text-muted-foreground line-through" : ""}`}
							>
								{item.title}
							</h3>
							<p className="text-xs text-muted-foreground">
								{item.servings} serving{item.servings === 1 ? "" : "s"}
								{(item.amount || item.note) && (
									<> · {[item.amount, item.note].filter(Boolean).join(" · ")}</>
								)}
							</p>
							<p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Quick meal
							</p>
						</div>
						<div className="flex gap-1">
							{editingOrder ? (
								<OrderButtons
									index={index}
									length={items.length}
									pending={orderPending}
									onMove={(direction) => onMove(index, direction)}
									label={item.title}
								/>
							) : (
								<>
									<Button
										variant="ghost"
										size="icon"
										className="size-11 sm:size-9"
										onClick={() => onEditManual(item)}
										aria-label={`Edit ${item.title}`}
									>
										<Pencil className="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-11 sm:size-9"
										onClick={() => onRemoveManual(item.id)}
										disabled={removeManualPending}
										aria-label={`Remove ${item.title}`}
									>
										<Trash2 className="size-4" />
									</Button>
								</>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}

function OrderButtons({
	index,
	length,
	pending,
	onMove,
	label,
}: {
	index: number;
	length: number;
	pending: boolean;
	onMove: (direction: -1 | 1) => void;
	label: string;
}) {
	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="size-11 sm:size-9"
				disabled={index === 0 || pending}
				onClick={() => onMove(-1)}
				aria-label={`Move ${label} up`}
			>
				<ArrowUp className="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				className="size-11 sm:size-9"
				disabled={index === length - 1 || pending}
				onClick={() => onMove(1)}
				aria-label={`Move ${label} down`}
			>
				<ArrowDown className="size-4" />
			</Button>
		</>
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
