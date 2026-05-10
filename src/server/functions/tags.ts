import { createServerFn } from "@tanstack/react-start";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { recipes, recipeTags, tags } from "../../db/schema.ts";
import { authedMiddleware } from "../auth/middleware.ts";

function normalizeTag(input: string): string {
	return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export const listTagsFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.handler(async () => {
		const counts = db
			.select({
				tagId: recipeTags.tagId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(recipeTags)
			.groupBy(recipeTags.tagId)
			.all();
		const countMap = new Map(counts.map((c) => [c.tagId, c.count]));
		return db
			.select()
			.from(tags)
			.orderBy(asc(tags.name))
			.all()
			.map((t) => ({ ...t, recipeCount: countMap.get(t.id) ?? 0 }));
	});

export const listTagsForRecipeFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ recipeId: z.string().min(1) }))
	.handler(async ({ data }) => {
		const ids = db
			.select({ id: recipeTags.tagId })
			.from(recipeTags)
			.where(eq(recipeTags.recipeId, data.recipeId))
			.all()
			.map((r) => r.id);
		if (ids.length === 0) return [];
		return db.select().from(tags).where(inArray(tags.id, ids)).all();
	});

export const setRecipeTagsFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			recipeId: z.string().min(1),
			tagNames: z.array(z.string()).default([]),
		}),
	)
	.handler(async ({ data }) => {
		const wanted = Array.from(
			new Set(data.tagNames.map(normalizeTag).filter(Boolean)),
		);

		const existing =
			wanted.length === 0
				? []
				: db.select().from(tags).where(inArray(tags.name, wanted)).all();
		const existingNames = new Set(existing.map((t) => t.name));
		const toCreate = wanted.filter((n) => !existingNames.has(n));
		const created = toCreate.map((name) => ({
			id: crypto.randomUUID(),
			name,
		}));
		if (created.length > 0) {
			db.insert(tags).values(created).run();
		}
		const allTags = [...existing, ...created];

		db.delete(recipeTags).where(eq(recipeTags.recipeId, data.recipeId)).run();
		if (allTags.length > 0) {
			db.insert(recipeTags)
				.values(allTags.map((t) => ({ recipeId: data.recipeId, tagId: t.id })))
				.run();
		}
		return { tagIds: allTags.map((t) => t.id) };
	});

export const listRecipesByTagFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ tag: z.string().min(1) }))
	.handler(async ({ data }) => {
		const name = normalizeTag(data.tag);
		const tag = db.select().from(tags).where(eq(tags.name, name)).get();
		if (!tag) return [];
		const recipeIds = db
			.select({ id: recipeTags.recipeId })
			.from(recipeTags)
			.where(eq(recipeTags.tagId, tag.id))
			.all()
			.map((r) => r.id);
		if (recipeIds.length === 0) return [];
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
			.where(inArray(recipes.id, recipeIds))
			.all();
	});
