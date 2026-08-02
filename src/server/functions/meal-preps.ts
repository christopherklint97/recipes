import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import {
	ingredients,
	mealPrepItems,
	mealPrepRecipes,
	mealPreps,
	recipes,
} from "../../db/schema.ts";
import { isIsoWeekStart } from "../../lib/week.ts";
import { authedMiddleware } from "../auth/middleware.ts";
import { manualMealPrepItemInput } from "./validation.ts";

const weekStartSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine(isIsoWeekStart, "Week start must be a valid ISO-week Monday");
const recipeIdsSchema = z.array(z.string().min(1)).max(100);
const mealPrepOrderItemSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("recipe"), id: z.string().min(1) }),
	z.object({ type: z.literal("manual"), id: z.string().min(1) }),
]);

function ensureMealPrepForWeek(weekStart: string): string {
	const existing = db
		.select({ id: mealPreps.id })
		.from(mealPreps)
		.where(eq(mealPreps.weekStart, weekStart))
		.get();
	if (existing) return existing.id;

	const id = crypto.randomUUID();
	db.insert(mealPreps)
		.values({ id, name: `Plan for ${weekStart}`, weekStart })
		.onConflictDoNothing({ target: mealPreps.weekStart })
		.run();
	return (
		db
			.select({ id: mealPreps.id })
			.from(mealPreps)
			.where(eq(mealPreps.weekStart, weekStart))
			.get()?.id ?? id
	);
}

export const ensureMealPrepForWeekFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(z.object({ weekStart: weekStartSchema }))
	.handler(async ({ data }) => ({ id: ensureMealPrepForWeek(data.weekStart) }));

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
				cooked: mealPrepRecipes.cooked,
				position: mealPrepRecipes.position,
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
								cooked: selection.cooked,
								position: selection.position,
								addedAt: selection.addedAt,
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

export const addRecipesToWeekFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			weekStart: weekStartSchema,
			recipeIds: recipeIdsSchema.min(1),
		}),
	)
	.handler(async ({ data }) => {
		const mealPrepId = ensureMealPrepForWeek(data.weekStart);
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
						mealPrepId,
						recipeId: recipe.id,
						servings: recipe.servings,
					})
					.onConflictDoNothing()
					.run();
			}
		});
		return { id: mealPrepId, count: recipeRows.length };
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
		const existsInMealPlan = db
			.select({ recipeId: mealPrepRecipes.recipeId })
			.from(mealPrepRecipes)
			.where(
				and(
					eq(mealPrepRecipes.mealPrepId, data.mealPrepId),
					eq(mealPrepRecipes.recipeId, data.recipeId),
				),
			)
			.get();
		if (!existsInMealPlan) {
			throw new Error("Recipe is not part of this meal plan");
		}
		db.update(mealPrepRecipes)
			.set({ servings: data.servings })
			.where(
				and(
					eq(mealPrepRecipes.mealPrepId, data.mealPrepId),
					eq(mealPrepRecipes.recipeId, data.recipeId),
				),
			)
			.run();
		return { ok: true };
	});

export const setMealPrepItemCookedFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			mealPrepId: z.string().min(1),
			type: z.enum(["recipe", "manual"]),
			id: z.string().min(1),
			cooked: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		if (data.type === "recipe") {
			db.update(mealPrepRecipes)
				.set({ cooked: data.cooked })
				.where(
					and(
						eq(mealPrepRecipes.mealPrepId, data.mealPrepId),
						eq(mealPrepRecipes.recipeId, data.id),
					),
				)
				.run();
		} else {
			db.update(mealPrepItems)
				.set({ cooked: data.cooked })
				.where(
					and(
						eq(mealPrepItems.mealPrepId, data.mealPrepId),
						eq(mealPrepItems.id, data.id),
					),
				)
				.run();
		}
		return { ok: true };
	});

export const reorderMealPrepItemsFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		z.object({
			mealPrepId: z.string().min(1),
			items: z.array(mealPrepOrderItemSchema).min(1).max(200),
		}),
	)
	.handler(async ({ data }) => {
		const recipeIds = db
			.select({ id: mealPrepRecipes.recipeId })
			.from(mealPrepRecipes)
			.where(eq(mealPrepRecipes.mealPrepId, data.mealPrepId))
			.all()
			.map(({ id }) => `recipe:${id}`);
		const manualIds = db
			.select({ id: mealPrepItems.id })
			.from(mealPrepItems)
			.where(eq(mealPrepItems.mealPrepId, data.mealPrepId))
			.all()
			.map(({ id }) => `manual:${id}`);
		const existing = new Set([...recipeIds, ...manualIds]);
		const requested = data.items.map((item) => `${item.type}:${item.id}`);
		if (
			existing.size !== requested.length ||
			new Set(requested).size !== requested.length ||
			requested.some((key) => !existing.has(key))
		) {
			throw new Error("Plan order is out of date. Refresh and try again.");
		}

		db.transaction((tx) => {
			data.items.forEach((item, position) => {
				if (item.type === "recipe") {
					tx.update(mealPrepRecipes)
						.set({ position })
						.where(
							and(
								eq(mealPrepRecipes.mealPrepId, data.mealPrepId),
								eq(mealPrepRecipes.recipeId, item.id),
							),
						)
						.run();
				} else {
					tx.update(mealPrepItems)
						.set({ position })
						.where(
							and(
								eq(mealPrepItems.mealPrepId, data.mealPrepId),
								eq(mealPrepItems.id, item.id),
							),
						)
						.run();
				}
			});
		});
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

export const addManualMealPrepItemToWeekFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.validator(
		manualMealPrepItemInput.omit({ mealPrepId: true }).extend({
			weekStart: weekStartSchema,
		}),
	)
	.handler(async ({ data }) => {
		const mealPrepId = ensureMealPrepForWeek(data.weekStart);
		const id = crypto.randomUUID();
		db.insert(mealPrepItems)
			.values({
				id,
				mealPrepId,
				title: data.title.trim(),
				servings: data.servings,
				image: data.image?.trim() || null,
				amount: data.amount?.trim() || null,
				note: data.note?.trim() || null,
			})
			.run();
		return { id, mealPrepId };
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
