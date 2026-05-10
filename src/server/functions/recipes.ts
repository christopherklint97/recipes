import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import {
	ingredients as ingredientsTable,
	instructions as instructionsTable,
	recipes,
	recipeTags,
	tags,
} from "../../db/schema.ts";
import { authedMiddleware } from "../auth/middleware.ts";

function normalizeTag(input: string): string {
	return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function writeRecipeTags(recipeId: string, tagNames: string[]): void {
	const wanted = Array.from(
		new Set(tagNames.map(normalizeTag).filter(Boolean)),
	);
	db.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId)).run();
	if (wanted.length === 0) return;

	const existing = db
		.select()
		.from(tags)
		.where(inArray(tags.name, wanted))
		.all();
	const existingNames = new Set(existing.map((t) => t.name));
	const created = wanted
		.filter((n) => !existingNames.has(n))
		.map((name) => ({ id: crypto.randomUUID(), name }));
	if (created.length > 0) {
		db.insert(tags).values(created).run();
	}
	const all = [...existing, ...created];
	db.insert(recipeTags)
		.values(all.map((t) => ({ recipeId, tagId: t.id })))
		.run();
}

const ingredientInput = z.object({
	position: z.number().int().nonnegative(),
	quantity: z.number().nullable().optional(),
	unit: z.string().nullable().optional(),
	name: z.string().min(1),
	note: z.string().nullable().optional(),
	groupName: z.string().nullable().optional(),
});

const instructionInput = z.object({
	position: z.number().int().nonnegative(),
	text: z.string().min(1),
	durationSeconds: z.number().int().nonnegative().nullable().optional(),
});

const recipeInput = z.object({
	title: z.string().min(1).max(200),
	description: z.string().nullable().optional(),
	sourceUrl: z.string().url().nullable().optional(),
	sourceType: z
		.enum(["manual", "url", "ocr", "social"])
		.optional()
		.default("manual"),
	heroImage: z.string().nullable().optional(),
	servings: z.number().int().min(1).max(100).default(2),
	prepMinutes: z.number().int().min(0).max(10000).nullable().optional(),
	cookMinutes: z.number().int().min(0).max(10000).nullable().optional(),
	caloriesPerServing: z.number().int().min(0).nullable().optional(),
	costEstimateCents: z.number().int().min(0).nullable().optional(),
	notes: z.string().nullable().optional(),
	rawImport: z.string().nullable().optional(),
	ingredients: z.array(ingredientInput).default([]),
	instructions: z.array(instructionInput).default([]),
	tagNames: z.array(z.string()).default([]),
});

export type RecipeInput = z.infer<typeof recipeInput>;

export const listRecipesFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(
		z
			.object({
				q: z.string().optional(),
			})
			.optional(),
	)
	.handler(async ({ data }) => {
		const q = data?.q?.trim();
		const where = q
			? or(like(recipes.title, `%${q}%`), like(recipes.description, `%${q}%`))
			: undefined;
		return db
			.select({
				id: recipes.id,
				title: recipes.title,
				description: recipes.description,
				heroImage: recipes.heroImage,
				prepMinutes: recipes.prepMinutes,
				cookMinutes: recipes.cookMinutes,
				servings: recipes.servings,
				createdAt: recipes.createdAt,
			})
			.from(recipes)
			.where(where)
			.orderBy(desc(recipes.createdAt))
			.all();
	});

export const getRecipeFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const recipe = db
			.select()
			.from(recipes)
			.where(eq(recipes.id, data.id))
			.get();
		if (!recipe) return null;
		const ings = db
			.select()
			.from(ingredientsTable)
			.where(eq(ingredientsTable.recipeId, data.id))
			.orderBy(ingredientsTable.position)
			.all();
		const inst = db
			.select()
			.from(instructionsTable)
			.where(eq(instructionsTable.recipeId, data.id))
			.orderBy(instructionsTable.position)
			.all();
		const tagRows = db
			.select({ name: tags.name })
			.from(tags)
			.innerJoin(recipeTags, eq(recipeTags.tagId, tags.id))
			.where(eq(recipeTags.recipeId, data.id))
			.all();
		return {
			...recipe,
			ingredients: ings,
			instructions: inst,
			tags: tagRows.map((t) => t.name),
		};
	});

function writeRecipeChildren(
	recipeId: string,
	ings: RecipeInput["ingredients"],
	inst: RecipeInput["instructions"],
) {
	db.delete(ingredientsTable)
		.where(eq(ingredientsTable.recipeId, recipeId))
		.run();
	db.delete(instructionsTable)
		.where(eq(instructionsTable.recipeId, recipeId))
		.run();
	if (ings.length > 0) {
		db.insert(ingredientsTable)
			.values(
				ings.map((row) => ({
					recipeId,
					position: row.position,
					quantity: row.quantity ?? null,
					unit: row.unit ?? null,
					name: row.name,
					note: row.note ?? null,
					groupName: row.groupName ?? null,
				})),
			)
			.run();
	}
	if (inst.length > 0) {
		db.insert(instructionsTable)
			.values(
				inst.map((row) => ({
					recipeId,
					position: row.position,
					text: row.text,
					durationSeconds: row.durationSeconds ?? null,
				})),
			)
			.run();
	}
}

export const createRecipeFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(recipeInput)
	.handler(async ({ data }) => {
		const id = crypto.randomUUID();
		db.insert(recipes)
			.values({
				id,
				title: data.title,
				description: data.description ?? null,
				sourceUrl: data.sourceUrl ?? null,
				sourceType: data.sourceType,
				heroImage: data.heroImage ?? null,
				servings: data.servings,
				prepMinutes: data.prepMinutes ?? null,
				cookMinutes: data.cookMinutes ?? null,
				caloriesPerServing: data.caloriesPerServing ?? null,
				costEstimateCents: data.costEstimateCents ?? null,
				notes: data.notes ?? null,
				rawImport: data.rawImport ?? null,
			})
			.run();
		writeRecipeChildren(id, data.ingredients, data.instructions);
		writeRecipeTags(id, data.tagNames);
		return { id };
	});

export const updateRecipeFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(recipeInput.extend({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const {
			id,
			ingredients: ings,
			instructions: inst,
			tagNames,
			...rest
		} = data;
		const existing = db
			.select({ id: recipes.id })
			.from(recipes)
			.where(eq(recipes.id, id))
			.get();
		if (!existing) {
			throw new Error("Recipe not found");
		}
		db.update(recipes)
			.set({
				title: rest.title,
				description: rest.description ?? null,
				sourceUrl: rest.sourceUrl ?? null,
				sourceType: rest.sourceType,
				heroImage: rest.heroImage ?? null,
				servings: rest.servings,
				prepMinutes: rest.prepMinutes ?? null,
				cookMinutes: rest.cookMinutes ?? null,
				caloriesPerServing: rest.caloriesPerServing ?? null,
				costEstimateCents: rest.costEstimateCents ?? null,
				notes: rest.notes ?? null,
				rawImport: rest.rawImport ?? null,
				updatedAt: new Date(),
			})
			.where(eq(recipes.id, id))
			.run();
		writeRecipeChildren(id, ings, inst);
		writeRecipeTags(id, tagNames);
		return { id };
	});

export const deleteRecipeFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.delete(recipes).where(eq(recipes.id, data.id)).run();
		return { id: data.id };
	});

export { recipeInput, ingredientInput, instructionInput };
