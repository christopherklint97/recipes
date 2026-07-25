import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarPlus,
	ChefHat,
	Clock,
	FolderPlus,
	Pencil,
	Play,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { AddToMealPrepDialog } from "../../components/meal-prep/AddToMealPrepDialog.tsx";
import { ServingsControl } from "../../components/recipe/ServingsControl.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../components/ui/dialog.tsx";
import { Separator } from "../../components/ui/separator.tsx";
import {
	formatRecipeDuration,
	totalRecipeMinutes,
} from "../../lib/recipe-duration.ts";
import { formatScaledQuantity, scaleQuantity } from "../../lib/servings.ts";
import {
	listCollectionsFn,
	listCollectionsForRecipeFn,
	setRecipeInCollectionFn,
} from "../../server/functions/collections.ts";
import { deleteRecipeFn, getRecipeFn } from "../../server/functions/recipes.ts";

export const Route = createFileRoute("/_app/recipes/$id")({
	loader: async ({ params }) => {
		const recipe = await getRecipeFn({ data: { id: params.id } });
		if (!recipe) throw notFound();
		return recipe;
	},
	component: RecipeDetailPage,
});

function RecipeDetailPage() {
	const recipe = Route.useLoaderData();
	const router = useRouter();
	const [mealPrepOpen, setMealPrepOpen] = useState(false);
	const [servings, setServings] = useState(recipe.servings);

	const del = useMutation({
		mutationFn: () => deleteRecipeFn({ data: { id: recipe.id } }),
		onSuccess: () => {
			void router.navigate({ to: "/recipes" });
		},
	});

	const totalMinutes = totalRecipeMinutes(recipe);

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5">
			<Button
				variant="ghost"
				size="sm"
				className="-ml-2"
				onClick={() => router.history.back()}
			>
				<ArrowLeft className="size-4" />
				Back
			</Button>
			<div className="space-y-3">
				<h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
					{recipe.title}
				</h1>
				{recipe.description && (
					<p className="text-sm text-muted-foreground sm:text-base">
						{recipe.description}
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					<Button asChild size="sm">
						<Link to="/recipes/$id/cook" params={{ id: recipe.id }}>
							<Play className="size-4" />
							Cook
						</Link>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setMealPrepOpen(true)}
					>
						<CalendarPlus className="size-4" />
						Add to meal prep
					</Button>
					<CollectionPickerButton recipeId={recipe.id} />
					<Button asChild variant="outline" size="sm">
						<Link to="/recipes/$id/edit" params={{ id: recipe.id }}>
							<Pencil className="size-4" />
							Edit
						</Link>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							if (confirm(`Delete "${recipe.title}"? This cannot be undone.`)) {
								del.mutate();
							}
						}}
						disabled={del.isPending}
					>
						<Trash2 className="size-4" />
						Delete
					</Button>
				</div>
			</div>

			{recipe.tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{recipe.tags.map((t) => (
						<Link key={t} to="/recipes" search={{ tag: t } as never}>
							<Badge variant="secondary" className="hover:bg-secondary/80">
								#{t}
							</Badge>
						</Link>
					))}
				</div>
			)}

			{recipe.heroImage && (
				<img
					src={recipe.heroImage}
					alt=""
					className="aspect-[16/9] w-full rounded-2xl object-cover"
				/>
			)}

			<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
				<ServingsControl
					value={servings}
					baseValue={recipe.servings}
					onChange={setServings}
				/>
				{totalMinutes && (
					<span className="inline-flex items-center gap-1.5">
						<Clock className="size-4" />
						{formatRecipeDuration(totalMinutes)}
					</span>
				)}
				{recipe.caloriesPerServing && (
					<span className="inline-flex items-center gap-1.5">
						<ChefHat className="size-4" />
						{recipe.caloriesPerServing} kcal / serving
					</span>
				)}
				{recipe.sourceUrl && (
					<a
						href={recipe.sourceUrl}
						target="_blank"
						rel="noreferrer"
						className="underline-offset-4 hover:underline"
					>
						source
					</a>
				)}
			</div>

			<Separator />

			<div className="grid gap-6 md:grid-cols-[1fr_2fr]">
				<Card>
					<CardHeader className="space-y-3">
						<CardTitle>Ingredients</CardTitle>
						<p className="text-xs font-normal text-muted-foreground">
							Amounts are scaled for {servings} serving
							{servings === 1 ? "" : "s"}.
						</p>
					</CardHeader>
					<CardContent>
						{recipe.ingredients.length === 0 ? (
							<p className="text-sm text-muted-foreground">None listed.</p>
						) : (
							<ul className="space-y-1.5 text-sm">
								{recipe.ingredients.map((ing) => (
									<li key={ing.id} className="flex gap-2">
										{ing.quantity != null && (
											<span className="font-medium tabular-nums">
												{formatScaledQuantity(
													scaleQuantity(
														ing.quantity,
														recipe.servings,
														servings,
													) ?? ing.quantity,
												)}
											</span>
										)}
										{ing.unit && (
											<span className="text-muted-foreground">{ing.unit}</span>
										)}
										<span>{ing.name}</span>
										{ing.note && (
											<span className="text-muted-foreground">
												({ing.note})
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Instructions</CardTitle>
					</CardHeader>
					<CardContent>
						{recipe.instructions.length === 0 ? (
							<p className="text-sm text-muted-foreground">None listed.</p>
						) : (
							<ol className="space-y-4 text-sm">
								{recipe.instructions.map((step, i) => (
									<li key={step.id} className="flex gap-3">
										<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
											{i + 1}
										</span>
										<p className="flex-1 leading-relaxed">{step.text}</p>
									</li>
								))}
							</ol>
						)}
					</CardContent>
				</Card>
			</div>

			{recipe.notes && (
				<Card>
					<CardHeader>
						<CardTitle>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap text-sm">{recipe.notes}</p>
					</CardContent>
				</Card>
			)}
			<AddToMealPrepDialog
				open={mealPrepOpen}
				onOpenChange={setMealPrepOpen}
				recipes={[{ id: recipe.id, title: recipe.title }]}
			/>
		</div>
	);
}

function CollectionPickerButton({ recipeId }: { recipeId: string }) {
	const [open, setOpen] = useState(false);
	const collectionsQ = useQuery({
		queryKey: ["collections"],
		queryFn: () => listCollectionsFn(),
		enabled: open,
	});
	const memberQ = useQuery({
		queryKey: ["collections", "for-recipe", recipeId],
		queryFn: () => listCollectionsForRecipeFn({ data: { recipeId } }),
		enabled: open,
	});
	const memberSet = new Set(memberQ.data ?? []);

	const toggle = useMutation({
		mutationFn: ({
			collectionId,
			present,
		}: {
			collectionId: string;
			present: boolean;
		}) =>
			setRecipeInCollectionFn({
				data: { recipeId, collectionId, present },
			}),
		onSuccess: async () => {
			await memberQ.refetch();
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<FolderPlus className="size-4" />
					Collections
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add to collection</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					{collectionsQ.isLoading && (
						<p className="text-sm text-muted-foreground">Loading…</p>
					)}
					{collectionsQ.data && collectionsQ.data.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No collections yet. Create one from the Collections page.
						</p>
					)}
					{collectionsQ.data?.map((c) => {
						const checked = memberSet.has(c.id);
						return (
							<button
								key={c.id}
								type="button"
								className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-accent"
								onClick={() =>
									toggle.mutate({
										collectionId: c.id,
										present: !checked,
									})
								}
							>
								<span className="flex items-center gap-2">
									{c.icon && <span>{c.icon}</span>}
									{c.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{checked ? "✓ Added" : "Add"}
								</span>
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
