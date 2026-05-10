import { useMutation } from "@tanstack/react-query";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import {
	RecipeForm,
	type RecipeFormValues,
	toRecipeInput,
} from "../../components/recipe/RecipeForm.tsx";
import { getRecipeFn, updateRecipeFn } from "../../server/functions/recipes.ts";

export const Route = createFileRoute("/_app/recipes/$id_/edit")({
	loader: async ({ params }) => {
		const recipe = await getRecipeFn({ data: { id: params.id } });
		if (!recipe) throw notFound();
		return recipe;
	},
	component: EditRecipePage,
});

function EditRecipePage() {
	const recipe = Route.useLoaderData();
	const router = useRouter();

	const update = useMutation({
		mutationFn: (values: RecipeFormValues) =>
			updateRecipeFn({
				data: {
					...toRecipeInput(values),
					id: recipe.id,
					sourceType: recipe.sourceType,
				},
			}),
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id", params: { id } });
		},
	});

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<header>
				<h1 className="text-3xl font-semibold tracking-tight">Edit recipe</h1>
				<p className="text-muted-foreground">{recipe.title}</p>
			</header>

			<RecipeForm
				submitLabel="Save changes"
				defaultValues={{
					title: recipe.title,
					description: recipe.description ?? "",
					heroImage: recipe.heroImage ?? "",
					servings: recipe.servings,
					prepMinutes: recipe.prepMinutes ?? undefined,
					cookMinutes: recipe.cookMinutes ?? undefined,
					caloriesPerServing: recipe.caloriesPerServing ?? undefined,
					costEstimateCents: recipe.costEstimateCents ?? undefined,
					notes: recipe.notes ?? "",
					sourceUrl: recipe.sourceUrl ?? "",
					ingredients: recipe.ingredients.map((row) => ({
						name: row.name,
						quantity: row.quantity ?? null,
						unit: row.unit ?? "",
						note: row.note ?? "",
						groupName: row.groupName ?? "",
					})),
					instructions: recipe.instructions.map((row) => ({
						text: row.text,
						durationSeconds: row.durationSeconds ?? null,
					})),
					tagNames: recipe.tags ?? [],
				}}
				onSubmit={async (v) => {
					await update.mutateAsync(v);
				}}
			/>
		</div>
	);
}
