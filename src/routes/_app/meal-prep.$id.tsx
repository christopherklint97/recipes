import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	CalendarDays,
	Minus,
	Pencil,
	Plus,
	ShoppingCart,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useMealPrep } from "../../components/meal-prep/MealPrepProvider.tsx";
import { RecipeDuration } from "../../components/recipe/RecipeDuration.tsx";
import { Button } from "../../components/ui/button.tsx";
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
	formatWeek,
	formatWeekRange,
	normalizeToWeekStart,
	weekStartFromOffset,
} from "../../lib/week.ts";
import {
	deleteMealPrepFn,
	getMealPrepFn,
	removeRecipeFromMealPrepFn,
	setMealPrepRecipeServingsFn,
	updateMealPrepFn,
} from "../../server/functions/meal-preps.ts";

export const Route = createFileRoute("/_app/meal-prep/$id")({
	loader: async ({ params }) => {
		const mealPrep = await getMealPrepFn({ data: { id: params.id } });
		if (!mealPrep) throw notFound();
		return mealPrep;
	},
	component: MealPrepDetailPage,
});

function MealPrepDetailPage() {
	const initial = Route.useLoaderData();
	const qc = useQueryClient();
	const router = useRouter();
	const { openMealPrep } = useMealPrep();
	const [editOpen, setEditOpen] = useState(false);
	const { data } = useQuery({
		queryKey: ["meal-prep", initial.id],
		queryFn: () => getMealPrepFn({ data: { id: initial.id } }),
		initialData: initial,
	});
	const mealPrep = data ?? initial;

	const remove = useMutation({
		mutationFn: (recipeId: string) =>
			removeRecipeFromMealPrepFn({
				data: { mealPrepId: mealPrep.id, recipeId },
			}),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["meal-prep", mealPrep.id] }),
	});
	const servings = useMutation({
		mutationFn: ({ recipeId, value }: { recipeId: string; value: number }) =>
			setMealPrepRecipeServingsFn({
				data: { mealPrepId: mealPrep.id, recipeId, servings: value },
			}),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["meal-prep", mealPrep.id] }),
	});
	const del = useMutation({
		mutationFn: () => deleteMealPrepFn({ data: { id: mealPrep.id } }),
		onSuccess: () => router.navigate({ to: "/meal-prep" }),
	});

	return (
		<div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">
						{mealPrep.name}
					</h1>
					<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
						<CalendarDays className="size-4" />
						{formatWeek(mealPrep.weekStart)} ·{" "}
						{formatWeekRange(mealPrep.weekStart)}· {mealPrep.recipes.length}{" "}
						recipe
						{mealPrep.recipes.length === 1 ? "" : "s"}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{mealPrep.recipes.length > 0 && (
						<Button onClick={() => openMealPrep(mealPrep.recipes)}>
							<ShoppingCart className="size-4" /> Add to shopping
						</Button>
					)}
					<Button asChild variant="outline">
						<Link to="/recipes">
							<Plus className="size-4" /> Add recipes
						</Link>
					</Button>
					<Button variant="outline" onClick={() => setEditOpen(true)}>
						<Pencil className="size-4" /> Edit
					</Button>
					<Button
						variant="ghost"
						onClick={() => {
							if (confirm(`Delete meal prep "${mealPrep.name}"?`)) del.mutate();
						}}
						disabled={del.isPending}
					>
						<Trash2 className="size-4" /> Delete
					</Button>
				</div>
			</header>

			{mealPrep.recipes.length === 0 ? (
				<div className="rounded-2xl border border-dashed p-12 text-center">
					<p className="text-muted-foreground">
						This meal prep is empty. Choose Meal prep on the Recipes page to add
						recipes.
					</p>
					<Button asChild className="mt-4">
						<Link to="/recipes">Browse recipes</Link>
					</Button>
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{mealPrep.recipes.map((recipe) => (
						<li
							key={recipe.id}
							className="overflow-hidden rounded-2xl border bg-card shadow-sm"
						>
							<Link to="/recipes/$id" params={{ id: recipe.id }}>
								{recipe.heroImage ? (
									<img
										src={recipe.heroImage}
										alt=""
										className="aspect-[4/3] w-full object-cover"
									/>
								) : (
									<div className="aspect-[4/3] w-full bg-muted" />
								)}
								<div className="space-y-1 p-4 pb-2">
									<h2 className="line-clamp-2 font-semibold">{recipe.title}</h2>
									<RecipeDuration
										prepMinutes={recipe.prepMinutes}
										cookMinutes={recipe.cookMinutes}
										className="text-xs text-muted-foreground"
									/>
								</div>
							</Link>
							<div className="flex items-center gap-2 px-4 pb-4">
								<Button
									variant="outline"
									size="icon"
									className="size-9"
									onClick={() =>
										servings.mutate({
											recipeId: recipe.id,
											value: Math.max(1, recipe.servings - 1),
										})
									}
									aria-label={`Decrease servings for ${recipe.title}`}
								>
									<Minus className="size-4" />
								</Button>
								<Input
									type="number"
									min={1}
									max={100}
									value={recipe.servings}
									className="h-9 w-20 text-center"
									onChange={(event) => {
										const value = Number(event.target.value);
										if (Number.isInteger(value) && value > 0 && value <= 100)
											servings.mutate({ recipeId: recipe.id, value });
									}}
								/>
								<Button
									variant="outline"
									size="icon"
									className="size-9"
									onClick={() =>
										servings.mutate({
											recipeId: recipe.id,
											value: Math.min(100, recipe.servings + 1),
										})
									}
									aria-label={`Increase servings for ${recipe.title}`}
								>
									<Plus className="size-4" />
								</Button>
								<span className="text-xs text-muted-foreground">servings</span>
								<Button
									variant="ghost"
									size="icon"
									className="ml-auto size-9"
									onClick={() => remove.mutate(recipe.id)}
									aria-label={`Remove ${recipe.title}`}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}

			<EditMealPrepDialog
				mealPrep={mealPrep}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>
		</div>
	);
}

function EditMealPrepDialog({
	mealPrep,
	open,
	onOpenChange,
}: {
	mealPrep: { id: string; name: string; weekStart: string };
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const qc = useQueryClient();
	const [name, setName] = useState(mealPrep.name);
	const [weekStart, setWeekStart] = useState(mealPrep.weekStart);
	const update = useMutation({
		mutationFn: () =>
			updateMealPrepFn({ data: { id: mealPrep.id, name, weekStart } }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ["meal-prep", mealPrep.id] });
			await qc.invalidateQueries({ queryKey: ["meal-preps"] });
			onOpenChange(false);
		},
	});
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit meal prep</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="edit-meal-name">Name</Label>
						<Input
							id="edit-meal-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-meal-week">Week</Label>
						<div className="flex flex-wrap gap-2">
							{[
								["This week", 0],
								["Next week", 1],
								["In two weeks", 2],
							].map(([label, offset]) => (
								<Button
									key={label}
									type="button"
									size="sm"
									variant={
										weekStart === weekStartFromOffset(Number(offset))
											? "secondary"
											: "outline"
									}
									onClick={() =>
										setWeekStart(weekStartFromOffset(Number(offset)))
									}
								>
									{label}
								</Button>
							))}
						</div>
						<Input
							id="edit-meal-week"
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
