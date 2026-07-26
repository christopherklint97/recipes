import { createServerFn } from "@tanstack/react-start";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import {
	ingredients,
	mealPrepItems,
	mealPrepRecipes,
	mealPreps,
	recipes,
} from "../../db/schema.ts";
import { authedMiddleware } from "../auth/middleware.ts";
import { manualMealPrepItemInput } from "./validation.ts";

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const recipeIdsSchema = z.array(z.string().min(1)).max(100);

export const listMealPrepsFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.handler(async () => {
		const counts = db
			.select({
				mealPrepId: mealPrepRecipes.mealPrepId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(mealPrepRecipes)
			.groupBy(mealPrepRecipes.mealPrepId)
			.all();
		const countById = new Map(
			counts.map((row) => [row.mealPrepId, Number(row.count)]),
		);
		const manualCounts = db
			.select({
				mealPrepId: mealPrepItems.mealPrepId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(mealPrepItems)
			.groupBy(mealPrepItems.mealPrepId)
			.all();
		const manualCountById = new Map(
			manualCounts.map((row) => [row.mealPrepId, Number(row.count)]),
		);
		return db
			.select()
			.from(mealPreps)
			.orderBy(desc(mealPreps.weekStart), asc(mealPreps.name))
			.all()
			.map((mealPrep) => ({
				...mealPrep,
				recipeCount: countById.get(mealPrep.id) ?? 0,
				manualItemCount: manualCountById.get(mealPrep.id) ?? 0,
				plannedItemCount:
					(countById.get(mealPrep.id) ?? 0) +
					(manualCountById.get(mealPrep.id) ?? 0),
			}));
	});

export const getMealPrepFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const mealPrep = db
			.select()
			.from(mealPreps)
			.where(eq(mealPreps.id, data.id))
			.get();
		if (!mealPrep) return null;
		const selections = db
			.select({
				recipeId: mealPrepRecipes.recipeId,
				servings: mealPrepRecipes.servings,
				addedAt: mealPrepRecipes.addedAt,
			})
			.from(mealPrepRecipes)
			.where(eq(mealPrepRecipes.mealPrepId, data.id))
			.orderBy(desc(mealPrepRecipes.addedAt))
			.all();
		const manualItems = db
			.select()
			.from(mealPrepItems)
			.where(eq(mealPrepItems.mealPrepId, data.id))
			.orderBy(desc(mealPrepItems.addedAt))
			.all();
		const recipeIds = selections.map((row) => row.recipeId);
		if (recipeIds.length === 0)
			return { ...mealPrep, recipes: [], manualItems };
		const recipeRows = db
			.select({
				id: recipes.id,
				title: recipes.title,
				description: recipes.description,
				heroImage: recipes.heroImage,
				prepMinutes: recipes.prepMinutes,
				cookMinutes: recipes.cookMinutes,
			})
			.from(recipes)
			.where(inArray(recipes.id, recipeIds))
			.all();
		const ingredientCounts = db
			.select({
				recipeId: ingredients.recipeId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(ingredients)
			.where(inArray(ingredients.recipeId, recipeIds))
			.groupBy(ingredients.recipeId)
			.all();
		const recipeById = new Map(recipeRows.map((row) => [row.id, row]));
		const countById = new Map(
			ingredientCounts.map((row) => [row.recipeId, Number(row.count)]),
		);
		return {
			...mealPrep,
			manualItems,
			recipes: selections.flatMap((selection) => {
				const recipe = recipeById.get(selection.recipeId);
				return recipe
					? [
							{
								...recipe,
								servings: selection.servings,
								ingredientCount: countById.get(recipe.id) ?? 0,
							},
						]
					: [];
			}),
		};
	});

export const createMealPrepFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			name: z.string().min(1).max(80),
			weekStart: weekStartSchema,
			recipeIds: recipeIdsSchema.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const id = crypto.randomUUID();
		const recipeIds = [...new Set(data.recipeIds ?? [])];
		const recipeRows =
			recipeIds.length === 0
				? []
				: db
						.select({ id: recipes.id, servings: recipes.servings })
						.from(recipes)
						.where(inArray(recipes.id, recipeIds))
						.all();
		db.transaction((tx) => {
			tx.insert(mealPreps)
				.values({ id, name: data.name.trim(), weekStart: data.weekStart })
				.run();
			for (const recipe of recipeRows) {
				tx.insert(mealPrepRecipes)
					.values({
						mealPrepId: id,
						recipeId: recipe.id,
						servings: recipe.servings,
					})
					.run();
			}
		});
		return { id };
	});

export const addRecipesToMealPrepFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			mealPrepId: z.string().min(1),
			recipeIds: recipeIdsSchema.min(1),
		}),
	)
	.handler(async ({ data }) => {
		const recipeIds = [...new Set(data.recipeIds)];
		const recipeRows = db
			.select({ id: recipes.id, servings: recipes.servings })
			.from(recipes)
			.where(inArray(recipes.id, recipeIds))
			.all();
		db.transaction((tx) => {
			for (const recipe of recipeRows) {
				tx.insert(mealPrepRecipes)
					.values({
						mealPrepId: data.mealPrepId,
						recipeId: recipe.id,
						servings: recipe.servings,
					})
					.onConflictDoNothing()
					.run();
			}
		});
		return { id: data.mealPrepId, count: recipeRows.length };
	});

export const updateMealPrepFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1).max(80),
			weekStart: weekStartSchema,
		}),
	)
	.handler(async ({ data }) => {
		db.update(mealPreps)
			.set({
				name: data.name.trim(),
				weekStart: data.weekStart,
				updatedAt: new Date(),
			})
			.where(eq(mealPreps.id, data.id))
			.run();
		return { id: data.id };
	});

export const setMealPrepRecipeServingsFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			mealPrepId: z.string().min(1),
			recipeId: z.string().min(1),
			servings: z.number().int().min(1).max(100),
		}),
	)
	.handler(async ({ data }) => {
		db.update(mealPrepRecipes)
			.set({ servings: data.servings })
			.where(
				sql`${mealPrepRecipes.mealPrepId} = ${data.mealPrepId} and ${mealPrepRecipes.recipeId} = ${data.recipeId}`,
			)
			.run();
		return { ok: true };
	});

export const removeRecipeFromMealPrepFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			mealPrepId: z.string().min(1),
			recipeId: z.string().min(1),
		}),
	)
	.handler(async ({ data }) => {
		db.delete(mealPrepRecipes)
			.where(
				sql`${mealPrepRecipes.mealPrepId} = ${data.mealPrepId} and ${mealPrepRecipes.recipeId} = ${data.recipeId}`,
			)
			.run();
		return { ok: true };
	});

export const addManualMealPrepItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(manualMealPrepItemInput)
	.handler(async ({ data }) => {
		const id = crypto.randomUUID();
		db.insert(mealPrepItems)
			.values({
				id,
				mealPrepId: data.mealPrepId,
				title: data.title.trim(),
				servings: data.servings,
				image: data.image?.trim() || null,
				amount: data.amount?.trim() || null,
				note: data.note?.trim() || null,
			})
			.run();
		return { id };
	});

export const updateManualMealPrepItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(manualMealPrepItemInput.extend({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.update(mealPrepItems)
			.set({
				title: data.title.trim(),
				servings: data.servings,
				image: data.image?.trim() || null,
				amount: data.amount?.trim() || null,
				note: data.note?.trim() || null,
			})
			.where(eq(mealPrepItems.id, data.id))
			.run();
		return { id: data.id };
	});

export const removeManualMealPrepItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.delete(mealPrepItems).where(eq(mealPrepItems.id, data.id)).run();
		return { ok: true };
	});

export const deleteMealPrepFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.delete(mealPreps).where(eq(mealPreps.id, data.id)).run();
		return { id: data.id };
	});
