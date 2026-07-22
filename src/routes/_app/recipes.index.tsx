import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	CheckSquare,
	Download,
	ListChecks,
	Plus,
	Search,
	ShoppingCart,
	X,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import {
	type MealPrepRecipe,
	useMealPrep,
} from "../../components/meal-prep/MealPrepProvider.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import { Input } from "../../components/ui/input.tsx";
import { listRecipesFn } from "../../server/functions/recipes.ts";
import { listRecipesByTagFn } from "../../server/functions/tags.ts";

const search = z.object({ tag: z.string().optional() });

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
	const { tag } = Route.useSearch();
	const navigate = useNavigate();
	const { openMealPrep } = useMealPrep();
	const [q, setQ] = useState("");
	const [selecting, setSelecting] = useState(false);
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

	const filtered =
		tag || q === ""
			? recipes
			: recipes.filter((recipe) =>
					`${recipe.title} ${recipe.description ?? ""}`
						.toLowerCase()
						.includes(q.toLowerCase()),
				);

	function clearTag() {
		void navigate({ to: "/recipes", search: {} as never });
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
		openMealPrep(Array.from(selected.values()));
		setSelected(new Map());
		setSelecting(false);
	}

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="text-3xl font-semibold tracking-tight">Recipes</h1>
					<p className="text-sm text-muted-foreground">
						{filtered.length} saved
						{selected.size > 0 && ` · ${selected.size} selected`}
					</p>
				</div>
				<div className="flex shrink-0 flex-wrap justify-end gap-2">
					<Button
						variant={selecting ? "secondary" : "outline"}
						size="sm"
						onClick={() => {
							setSelecting((value) => !value);
							if (selecting) setSelected(new Map());
						}}
					>
						<ListChecks className="size-4" />
						{selecting ? "Cancel" : "Meal prep"}
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
				<div className="relative">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder="Search recipes…"
						className="pl-9"
						disabled={!!tag}
					/>
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
				<EmptyState hasFilter={!!tag || q.length > 0} />
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((recipe) => {
						const isSelected = selected.has(recipe.id);
						const cardClass = `group relative block w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
							isSelected ? "border-primary ring-2 ring-primary/30" : ""
						}`;
						const cardContent = (
							<>
								{recipe.heroImage ? (
									<img
										src={recipe.heroImage}
										alt=""
										className="block aspect-[4/3] w-full object-cover"
									/>
								) : (
									<div className="aspect-[4/3] w-full bg-muted" />
								)}
								<div className="space-y-1 p-4">
									<h3 className="line-clamp-2 font-semibold leading-snug">
										{recipe.title}
									</h3>
									{recipe.description && (
										<p className="line-clamp-2 text-sm text-muted-foreground">
											{recipe.description}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{recipe.servings} servings · {recipe.ingredientCount}{" "}
										ingredients
									</p>
								</div>
							</>
						);
						return (
							<li key={recipe.id} className="relative">
								{selecting ? (
									<button
										type="button"
										className={cardClass}
										onClick={() => toggleRecipe(recipe)}
										aria-pressed={isSelected}
									>
										{cardContent}
									</button>
								) : (
									<Link
										to="/recipes/$id"
										params={{ id: recipe.id }}
										className={cardClass}
									>
										{cardContent}
									</Link>
								)}
								{selecting ? (
									<div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/90 p-1 shadow">
										<Checkbox checked={isSelected} tabIndex={-1} />
									</div>
								) : (
									<Button
										type="button"
										variant="secondary"
										size="icon"
										className="absolute right-3 top-3 shadow"
										onClick={() => openMealPrep([recipe])}
										aria-label={`Add ${recipe.title} to shopping`}
									>
										<ShoppingCart className="size-4" />
									</Button>
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
							Adjust servings and batches next
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
						Set quantities
						<ShoppingCart className="size-4" />
					</Button>
				</div>
			)}
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
