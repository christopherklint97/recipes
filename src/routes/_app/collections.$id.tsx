import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	CalendarPlus,
	CheckSquare,
	ListChecks,
	Pencil,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import {
	AddToMealPrepDialog,
	type MealPrepCandidate,
} from "../../components/meal-prep/AddToMealPrepDialog.tsx";
import type { MealPrepRecipe } from "../../components/meal-prep/MealPrepProvider.tsx";
import { RecipeDuration } from "../../components/recipe/RecipeDuration.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../components/ui/dialog.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
	deleteCollectionFn,
	getCollectionFn,
	setRecipeInCollectionFn,
	updateCollectionFn,
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
	const [selecting, setSelecting] = useState(false);
	const [mealPrepOpen, setMealPrepOpen] = useState(false);
	const [mealPrepRecipes, setMealPrepRecipes] = useState<MealPrepCandidate[]>(
		[],
	);
	const [editOpen, setEditOpen] = useState(false);
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
		setMealPrepRecipes(Array.from(selected.values()));
		setMealPrepOpen(true);
		setSelected(new Map());
		setSelecting(false);
	}

	function addToMealPrep(recipes: MealPrepCandidate[]) {
		setMealPrepRecipes(recipes);
		setMealPrepOpen(true);
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
								onClick={() => addToMealPrep(collection.recipes)}
							>
								<CalendarPlus className="size-4" />
								Add all to week
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
								{selecting ? "Cancel" : "Plan meals"}
							</Button>
						</>
					)}
					<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
						<Pencil className="size-4" />
						Edit
					</Button>
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
										onClick={() => addToMealPrep([recipe])}
										aria-label={`Add ${recipe.title} to meal prep`}
									>
										<CalendarPlus className="size-4" />
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
							Add them to one weekly plan
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
						Add to week
						<CalendarPlus className="size-4" />
					</Button>
				</div>
			)}
			<AddToMealPrepDialog
				open={mealPrepOpen}
				onOpenChange={setMealPrepOpen}
				recipes={mealPrepRecipes}
			/>
			<EditCollectionDialog
				collection={collection}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>
		</div>
	);
}

function EditCollectionDialog({
	collection,
	open,
	onOpenChange,
}: {
	collection: {
		id: string;
		name: string;
		icon: string | null;
		recipes: Array<{ id: string; title: string }>;
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [name, setName] = useState(collection.name);
	const [icon, setIcon] = useState(collection.icon ?? "");
	const update = useMutation({
		mutationFn: () =>
			updateCollectionFn({
				data: { id: collection.id, name, icon: icon.trim() || null },
			}),
		onSuccess: async () => {
			onOpenChange(false);
			await router.invalidate();
		},
	});
	const removeRecipe = useMutation({
		mutationFn: (recipeId: string) =>
			setRecipeInCollectionFn({
				data: { collectionId: collection.id, recipeId, present: false },
			}),
		onSuccess: () => router.invalidate(),
	});
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit collection</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-collection-name">Name</Label>
						<Input
							id="edit-collection-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-collection-icon">Icon (emoji)</Label>
						<Input
							id="edit-collection-icon"
							value={icon}
							onChange={(event) => setIcon(event.target.value)}
							maxLength={4}
						/>
					</div>
					<div className="space-y-2">
						<Label>Recipes</Label>
						{collection.recipes.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No recipes in this collection.
							</p>
						) : (
							<ul className="max-h-52 space-y-2 overflow-auto">
								{collection.recipes.map((recipe) => (
									<li
										key={recipe.id}
										className="flex items-center gap-2 rounded-lg border p-2"
									>
										<span className="min-w-0 flex-1 truncate text-sm">
											{recipe.title}
										</span>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeRecipe.mutate(recipe.id)}
										>
											Remove
										</Button>
									</li>
								))}
							</ul>
						)}
						<p className="text-xs text-muted-foreground">
							Add more recipes using the collection button on a recipe page.
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={() => update.mutate()}
						disabled={!name.trim() || update.isPending}
					>
						{update.isPending ? "Saving…" : "Save changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
