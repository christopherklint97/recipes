import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	RecipeForm,
	type RecipeFormValues,
	toRecipeInput,
} from "../../components/recipe/RecipeForm.tsx";
import { createRecipeFn } from "../../server/functions/recipes.ts";

export const Route = createFileRoute("/_app/recipes/new")({
	component: NewRecipePage,
});

function NewRecipePage() {
	const router = useRouter();
	const create = useMutation({
		mutationFn: (values: RecipeFormValues) =>
			createRecipeFn({
				data: { ...toRecipeInput(values), sourceType: "manual" },
			}),
		onSuccess: ({ id }) => {
			void router.navigate({ to: "/recipes/$id", params: { id } });
		},
	});

	return (
		<div className="mx-auto max-w-3xl space-y-6 p-6">
			<header>
				<h1 className="text-3xl font-semibold tracking-tight">New recipe</h1>
				<p className="text-muted-foreground">Add a recipe by hand.</p>
			</header>

			<RecipeForm
				submitLabel="Save recipe"
				onSubmit={async (v) => {
					await create.mutateAsync(v);
				}}
			/>
		</div>
	);
}
