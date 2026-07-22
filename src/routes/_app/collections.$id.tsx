import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { CheckSquare, ListChecks, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import {
	type MealPrepRecipe,
	useMealPrep,
} from "../../components/meal-prep/MealPrepProvider.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import {
	deleteCollectionFn,
	getCollectionFn,
} from "../../server/functions/collections.ts";

export const Route = createFileRoute("/_app/collections/$id")({
	loader: async ({ params }) => {
		const collection = await getCollectionFn({ data: { id: params.id } });
		if (!collection) throw notFound();
		return collection;
	},
	component: CollectionPage,
});

function CollectionPage() {
	const collection = Route.useLoaderData();
	const router = useRouter();
	const { openMealPrep } = useMealPrep();
	const [selecting, setSelecting] = useState(false);
	const [selected, setSelected] = useState<Map<string, MealPrepRecipe>>(
		new Map(),
	);

	const del = useMutation({
		mutationFn: () => deleteCollectionFn({ data: { id: collection.id } }),
		onSuccess: () => {
			void router.navigate({ to: "/collections" });
		},
	});

	function toggleRecipe(recipe: MealPrepRecipe) {
		setSelected((current) => {
			const next = new Map(current);
			if (next.has(recipe.id)) next.delete(recipe.id);
			else next.set(recipe.id, recipe);
			return next;
		});
	}

	function selectAll() {
		setSelected(
			new Map(collection.recipes.map((recipe) => [recipe.id, recipe])),
		);
	}

	function reviewSelected() {
		if (selected.size === 0) return;
		openMealPrep(Array.from(selected.values()));
		setSelected(new Map());
		setSelecting(false);
	}

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
						{collection.icon && <span>{collection.icon}</span>}
						{collection.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						{collection.recipes.length} recipe
						{collection.recipes.length === 1 ? "" : "s"}
						{selected.size > 0 && ` · ${selected.size} selected`}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{collection.recipes.length > 0 && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={() => openMealPrep(collection.recipes)}
							>
								<ShoppingCart className="size-4" />
								Add collection
							</Button>
							<Button
								variant={selecting ? "secondary" : "outline"}
								size="sm"
								onClick={() => {
									setSelecting((value) => !value);
									if (selecting) setSelected(new Map());
								}}
							>
								<ListChecks className="size-4" />
								{selecting ? "Cancel" : "Select recipes"}
							</Button>
						</>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							if (confirm(`Delete collection "${collection.name}"?`)) {
								del.mutate();
							}
						}}
						disabled={del.isPending}
					>
						<Trash2 className="size-4" />
						Delete
					</Button>
				</div>
			</header>

			{selecting && (
				<div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-2">
					<Button variant="ghost" size="sm" onClick={selectAll}>
						<CheckSquare className="size-4" />
						Select all
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelected(new Map())}
					>
						Clear selection
					</Button>
				</div>
			)}

			{collection.recipes.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
					This collection is empty. Add recipes from the recipe page.
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{collection.recipes.map((recipe) => {
						const isSelected = selected.has(recipe.id);
						const cardClass = `group relative block w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
							isSelected ? "border-primary ring-2 ring-primary/30" : ""
						}`;
						const content = (
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
										{content}
									</button>
								) : (
									<Link
										to="/recipes/$id"
										params={{ id: recipe.id }}
										className={cardClass}
									>
										{content}
									</Link>
								)}
								{selecting ? (
									<div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/90 p-1 shadow">
										<Checkbox checked={isSelected} tabIndex={-1} />
									</div>
								) : (
									<Button
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
					<div className="flex-1">
						<p className="font-medium">{selected.size} recipes selected</p>
						<p className="text-xs text-muted-foreground">
							Adjust quantities next
						</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelected(new Map())}
					>
						Clear
					</Button>
					<Button onClick={reviewSelected}>
						Set quantities
						<ShoppingCart className="size-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
