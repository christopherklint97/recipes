import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { collections, recipeCollections, recipes } from "../../db/schema.ts";
import { authedMiddleware } from "../auth/middleware.ts";

export const listCollectionsFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.handler(async () => {
		const counts = db
			.select({
				collectionId: recipeCollections.collectionId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(recipeCollections)
			.groupBy(recipeCollections.collectionId)
			.all();
		const countMap = new Map(counts.map((c) => [c.collectionId, c.count]));
		const rows = db
			.select()
			.from(collections)
			.orderBy(asc(collections.name))
			.all();
		return rows.map((c) => ({ ...c, recipeCount: countMap.get(c.id) ?? 0 }));
	});

export const getCollectionFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		const collection = db
			.select()
			.from(collections)
			.where(eq(collections.id, data.id))
			.get();
		if (!collection) return null;
		const recipeIds = db
			.select({ id: recipeCollections.recipeId })
			.from(recipeCollections)
			.where(eq(recipeCollections.collectionId, data.id))
			.orderBy(desc(recipeCollections.addedAt))
			.all()
			.map((r) => r.id);
		const items =
			recipeIds.length === 0
				? []
				: db
						.select({
							id: recipes.id,
							title: recipes.title,
							description: recipes.description,
							heroImage: recipes.heroImage,
						})
						.from(recipes)
						.where(inArray(recipes.id, recipeIds))
						.all();
		return { ...collection, recipes: items };
	});

export const createCollectionFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			name: z.string().min(1).max(80),
			icon: z.string().max(8).nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const id = crypto.randomUUID();
		db.insert(collections)
			.values({ id, name: data.name.trim(), icon: data.icon ?? null })
			.run();
		return { id };
	});

export const updateCollectionFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			id: z.string().min(1),
			name: z.string().min(1).max(80),
			icon: z.string().max(8).nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		db.update(collections)
			.set({
				name: data.name.trim(),
				icon: data.icon ?? null,
				updatedAt: new Date(),
			})
			.where(eq(collections.id, data.id))
			.run();
		return { id: data.id };
	});

export const deleteCollectionFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.delete(collections).where(eq(collections.id, data.id)).run();
		return { id: data.id };
	});

export const setRecipeInCollectionFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			recipeId: z.string().min(1),
			collectionId: z.string().min(1),
			present: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		if (data.present) {
			db.insert(recipeCollections)
				.values({
					recipeId: data.recipeId,
					collectionId: data.collectionId,
				})
				.onConflictDoNothing()
				.run();
		} else {
			db.delete(recipeCollections)
				.where(
					and(
						eq(recipeCollections.recipeId, data.recipeId),
						eq(recipeCollections.collectionId, data.collectionId),
					),
				)
				.run();
		}
		return { ok: true };
	});

export const listCollectionsForRecipeFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ recipeId: z.string().min(1) }))
	.handler(async ({ data }) => {
		return db
			.select({ id: recipeCollections.collectionId })
			.from(recipeCollections)
			.where(eq(recipeCollections.recipeId, data.recipeId))
			.all()
			.map((r) => r.id);
	});
