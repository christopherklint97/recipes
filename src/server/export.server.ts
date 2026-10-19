// Read-only export of the recipe collection for Familjen AB (one-way sync; edits happen here).
import { asc, eq } from "drizzle-orm";
import { db, schema } from "#/db/index.ts";

export type ExportedRecipe = {
	id: string;
	title: string;
	description: string | null;
	sourceUrl: string | null;
	heroImage: string | null;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	caloriesPerServing: number | null;
	notes: string | null;
	tags: string[];
	collections: string[];
	ingredients: Array<{
		quantity: number | null;
		unit: string | null;
		name: string;
		note: string | null;
		group: string | null;
	}>;
	steps: string[];
	updatedAt: string;
};

export function exportRecipes(): ExportedRecipe[] {
	const recipes = db.select().from(schema.recipes).orderBy(asc(schema.recipes.title)).all();
	const ingredients = db
		.select()
		.from(schema.ingredients)
		.orderBy(asc(schema.ingredients.position))
		.all();
	const steps = db
		.select()
		.from(schema.instructions)
		.orderBy(asc(schema.instructions.position))
		.all();
	const tags = db
		.select({ recipeId: schema.recipeTags.recipeId, name: schema.tags.name })
		.from(schema.recipeTags)
		.innerJoin(schema.tags, eq(schema.tags.id, schema.recipeTags.tagId))
		.all();
	const collections = db
		.select({ recipeId: schema.recipeCollections.recipeId, name: schema.collections.name })
		.from(schema.recipeCollections)
		.innerJoin(
			schema.collections,
			eq(schema.collections.id, schema.recipeCollections.collectionId),
		)
		.all();

	const group = <T extends { recipeId: string }>(rows: T[]) => {
		const map = new Map<string, T[]>();
		for (const row of rows) {
			const list = map.get(row.recipeId) ?? [];
			list.push(row);
			map.set(row.recipeId, list);
		}
		return map;
	};
	const ingByRecipe = group(ingredients);
	const stepsByRecipe = group(steps);
	const tagsByRecipe = group(tags);
	const colByRecipe = group(collections);

	return recipes.map((r) => ({
		id: r.id,
		title: r.title,
		description: r.description,
		sourceUrl: r.sourceUrl,
		heroImage: r.heroImage,
		servings: r.servings,
		prepMinutes: r.prepMinutes,
		cookMinutes: r.cookMinutes,
		caloriesPerServing: r.caloriesPerServing,
		notes: r.notes,
		tags: (tagsByRecipe.get(r.id) ?? []).map((t) => t.name),
		collections: (colByRecipe.get(r.id) ?? []).map((c) => c.name),
		ingredients: (ingByRecipe.get(r.id) ?? []).map((i) => ({
			quantity: i.quantity,
			unit: i.unit,
			name: i.name,
			note: i.note,
			group: i.groupName,
		})),
		steps: (stepsByRecipe.get(r.id) ?? []).map((s) => s.text),
		updatedAt: (r.updatedAt ?? r.createdAt).toISOString(),
	}));
}
