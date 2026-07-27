import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	CalendarPlus,
	CheckSquare,
	Download,
	ListChecks,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
	AddToMealPrepDialog,
	type MealPrepCandidate,
} from "../../components/meal-prep/AddToMealPrepDialog.tsx";
import type { MealPrepRecipe } from "../../components/meal-prep/MealPrepProvider.tsx";
import { RecipeDuration } from "../../components/recipe/RecipeDuration.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import { Input } from "../../components/ui/input.tsx";
import {
	DURATION_FILTERS,
	type DurationFilter,
	matchesDurationFilter,
} from "../../lib/recipe-duration.ts";
import { listRecipesFn } from "../../server/functions/recipes.ts";
import { listRecipesByTagFn } from "../../server/functions/tags.ts";

const search = z.object({
	tag: z.string().optional(),
	weekStart: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});

export const Route = createFileRoute("/_app/recipes/")({
	validateSearch: search,
	loaderDeps: ({ search: s }) => ({ tag: s.tag }),
	loader: ({ deps }) =>
		deps.tag
			? listRecipesByTagFn({ data: { tag: deps.tag } })
			: listRecipesFn(),
	component: RecipesPage,
});

function RecipesPage() {
	const initial = Route.useLoaderData();
	const { tag, weekStart } = Route.useSearch();
	const navigate = useNavigate();
	const [q, setQ] = useState("");
	const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
	const [selecting, setSelecting] = useState(false);
	const [mealPrepRecipes, setMealPrepRecipes] = useState<MealPrepCandidate[]>(
		[],
	);
	const [mealPrepOpen, setMealPrepOpen] = useState(false);
	const [selected, setSelected] = useState<Map<string, MealPrepRecipe>>(
		new Map(),
	);

	const { data: recipes = initial } = useQuery({
		queryKey: ["recipes", { q, tag: tag ?? null }],
		queryFn: () =>
			tag
				? listRecipesByTagFn({ data: { tag } })
				: listRecipesFn({ data: { q } }),
		initialData: q === "" && !tag ? initial : undefined,
		placeholderData: (prev) => prev,
	});

	const searched = recipes;
	const filtered = searched.filter((recipe) =>
		matchesDurationFilter(recipe, durationFilter),
	);

	function clearTag() {
		void navigate({ to: "/recipes", search: weekStart ? { weekStart } : {} });
	}

	function toggleRecipe(recipe: MealPrepRecipe) {
		setSelected((current) => {
			const next = new Map(current);
			if (next.has(recipe.id)) next.delete(recipe.id);
			else next.set(recipe.id, recipe);
			return next;
		});
	}

	function selectAllVisible() {
		setSelected((current) => {
			const next = new Map(current);
			for (const recipe of filtered) next.set(recipe.id, recipe);
			return next;
		});
	}

	function finishSelection() {
		if (selected.size === 0) return;
		setMealPrepRecipes(Array.from(selected.values()));
		setMealPrepOpen(true);
		setSelected(new Map());
		setSelecting(false);
	}

	function addRecipeToMealPrep(recipe: MealPrepCandidate) {
		setMealPrepRecipes([recipe]);
		setMealPrepOpen(true);
	}

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="space-y-3">
				<div className="min-w-0">
					<h1 className="text-3xl font-semibold tracking-tight">Recipes</h1>
					<p className="text-sm text-muted-foreground">
						{filtered.length} saved
						{selected.size > 0 && ` · ${selected.size} selected`}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant={selecting ? "secondary" : "outline"}
						size="sm"
						onClick={() => {
							setSelecting((value) => !value);
							if (selecting) setSelected(new Map());
						}}
					>
						<ListChecks className="size-4" />
						{selecting ? "Cancel" : "Plan meals"}
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link to="/import">
							<Download className="size-4" />
							Import
						</Link>
					</Button>
					<Button asChild size="sm">
						<Link to="/recipes/new">
							<Plus className="size-4" />
							New
						</Link>
					</Button>
				</div>
			</header>

			<div className="space-y-3">
				<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={q}
							onChange={(event) => setQ(event.target.value)}
							placeholder="Search recipes or ingredients…"
							aria-label="Search recipe titles, descriptions, and ingredients"
							className="pl-9"
							disabled={!!tag}
						/>
					</div>
					<label className="sr-only" htmlFor="duration-filter">
						Filter by total duration
					</label>
					<select
						id="duration-filter"
						value={durationFilter}
						onChange={(event) =>
							setDurationFilter(event.target.value as DurationFilter)
						}
						className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						<option value="all">Any duration</option>
						{DURATION_FILTERS.map((range) => (
							<option key={range.value} value={range.value}>
								{range.label}
							</option>
						))}
					</select>
				</div>

				{tag && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Tag:</span>
						<Badge variant="secondary" className="gap-1">
							#{tag}
							<button
								type="button"
								onClick={clearTag}
								className="ml-1 rounded-sm hover:bg-muted-foreground/20"
								aria-label="Clear tag filter"
							>
								<X className="size-3" />
							</button>
						</Badge>
					</div>
				)}

				{selecting && filtered.length > 0 && (
					<div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-2">
						<Button variant="ghost" size="sm" onClick={selectAllVisible}>
							<CheckSquare className="size-4" />
							Select all visible
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSelected(new Map())}
						>
							Clear selection
						</Button>
						<span className="ml-auto text-xs text-muted-foreground">
							Selections stay while you search or filter
						</span>
					</div>
				)}
			</div>

			{filtered.length === 0 ? (
				<EmptyState
					hasFilter={!!tag || q.length > 0 || durationFilter !== "all"}
				/>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((recipe) => {
						const isSelected = selected.has(recipe.id);
						const image = recipe.heroImage ? (
							<img
								src={recipe.heroImage}
								alt=""
								className="block aspect-[4/3] w-full object-cover"
							/>
						) : (
							<div className="aspect-[4/3] w-full bg-muted" />
						);
						return (
							<li
								key={recipe.id}
								className={`relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md ${isSelected ? "border-primary ring-2 ring-primary/30" : ""}`}
							>
								{selecting ? (
									<button
										type="button"
										className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={() => toggleRecipe(recipe)}
										aria-pressed={isSelected}
									>
										{image}
										<div className="space-y-1 p-4">
											<h3 className="line-clamp-2 font-semibold leading-snug">
												{recipe.title}
											</h3>
											{recipe.description && (
												<p className="line-clamp-2 text-sm text-muted-foreground">
													{recipe.description}
												</p>
											)}
											<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
												<span>
													{recipe.servings} servings · {recipe.ingredientCount}{" "}
													ingredients
												</span>
												<RecipeDuration
													prepMinutes={recipe.prepMinutes}
													cookMinutes={recipe.cookMinutes}
												/>
											</div>
										</div>
									</button>
								) : (
									<>
										<Link
											to="/recipes/$id"
											params={{ id: recipe.id }}
											className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											{image}
										</Link>
										<div className="space-y-2 p-4">
											<Link
												to="/recipes/$id"
												params={{ id: recipe.id }}
												className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<h3 className="line-clamp-2 font-semibold leading-snug">
													{recipe.title}
												</h3>
											</Link>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={() => addRecipeToMealPrep(recipe)}
											>
												<CalendarPlus className="size-4" /> Add to week
											</Button>
											{recipe.description && (
												<p className="line-clamp-2 text-sm text-muted-foreground">
													{recipe.description}
												</p>
											)}
											<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
												<span>
													{recipe.servings} servings · {recipe.ingredientCount}{" "}
													ingredients
												</span>
												<RecipeDuration
													prepMinutes={recipe.prepMinutes}
													cookMinutes={recipe.cookMinutes}
												/>
											</div>
										</div>
									</>
								)}
								{selecting && (
									<div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/90 p-1 shadow">
										<Checkbox checked={isSelected} tabIndex={-1} />
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{selecting && selected.size > 0 && (
				<div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur md:bottom-5">
					<div className="min-w-0 flex-1">
						<p className="font-medium">{selected.size} recipes selected</p>
						<p className="text-xs text-muted-foreground">
							Add them together to one weekly plan
						</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelected(new Map())}
					>
						Clear
					</Button>
					<Button onClick={finishSelection}>
						Add to week
						<CalendarPlus className="size-4" />
					</Button>
				</div>
			)}
			<AddToMealPrepDialog
				open={mealPrepOpen}
				onOpenChange={setMealPrepOpen}
				recipes={mealPrepRecipes}
				defaultWeekStart={weekStart}
			/>
		</div>
	);
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
	return (
		<div className="rounded-2xl border border-dashed p-12 text-center">
			<p className="text-muted-foreground">
				{hasFilter
					? "No recipes match this filter."
					: "No recipes yet. Add your first one."}
			</p>
			{!hasFilter && (
				<Button asChild className="mt-4">
					<Link to="/recipes/new">
						<Plus className="size-4" />
						New recipe
					</Link>
				</Button>
			)}
		</div>
	);
}
