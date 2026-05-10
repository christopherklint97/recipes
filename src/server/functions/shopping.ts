import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import {
	ingredients as ingredientsTable,
	recipes,
	shoppingChecks,
	shoppingItems,
	shoppingRecipes,
} from "../../db/schema.ts";
import { authedMiddleware } from "../auth/middleware.ts";

function normalizeIngredientName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function unitKey(unit: string | null): string {
	return (unit ?? "").trim().toLowerCase();
}

function aggregateKey(name: string, unit: string | null): string {
	return `${normalizeIngredientName(name)}__${unitKey(unit)}`;
}

export const listShoppingFn = createServerFn({ method: "GET" })
	.middleware([authedMiddleware])
	.handler(async () => {
		const picked = db
			.select({
				recipeId: shoppingRecipes.recipeId,
				servings: shoppingRecipes.servings,
				addedAt: shoppingRecipes.addedAt,
				title: recipes.title,
				heroImage: recipes.heroImage,
				baseServings: recipes.servings,
			})
			.from(shoppingRecipes)
			.innerJoin(recipes, eq(recipes.id, shoppingRecipes.recipeId))
			.all();

		const recipeIds = picked.map((p) => p.recipeId);
		const allIngredients =
			recipeIds.length === 0
				? []
				: db
						.select()
						.from(ingredientsTable)
						.where(inArray(ingredientsTable.recipeId, recipeIds))
						.all();

		const checkRows = db.select().from(shoppingChecks).all();
		const checkedKeys = new Set(checkRows.map((r) => r.key));

		type AggItem = {
			key: string;
			ingredientName: string;
			unit: string | null;
			quantity: number | null;
			unknownQty: boolean;
			fromRecipes: string[];
		};
		const agg = new Map<string, AggItem>();
		const ingByRecipe = new Map<string, typeof allIngredients>();
		for (const ing of allIngredients) {
			const list = ingByRecipe.get(ing.recipeId) ?? [];
			list.push(ing);
			ingByRecipe.set(ing.recipeId, list);
		}

		for (const p of picked) {
			const base = Math.max(1, p.baseServings);
			const scale = p.servings / base;
			for (const ing of ingByRecipe.get(p.recipeId) ?? []) {
				const key = aggregateKey(ing.name, ing.unit);
				const scaledQty =
					ing.quantity != null ? Number(ing.quantity) * scale : null;
				const cur = agg.get(key);
				if (cur) {
					if (scaledQty == null) {
						cur.unknownQty = true;
					} else {
						cur.quantity = (cur.quantity ?? 0) + scaledQty;
					}
					if (!cur.fromRecipes.includes(p.title)) cur.fromRecipes.push(p.title);
				} else {
					agg.set(key, {
						key,
						ingredientName: ing.name,
						unit: ing.unit,
						quantity: scaledQty,
						unknownQty: scaledQty == null,
						fromRecipes: [p.title],
					});
				}
			}
		}

		const aggregated = Array.from(agg.values())
			.map((v) => ({
				key: v.key,
				ingredientName: v.ingredientName,
				unit: v.unit,
				quantity: v.quantity,
				unknownQty: v.unknownQty,
				fromRecipes: v.fromRecipes,
				checked: checkedKeys.has(v.key),
			}))
			.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

		const manual = db
			.select()
			.from(shoppingItems)
			.orderBy(shoppingItems.checked, shoppingItems.ingredientName)
			.all();

		return {
			pickedRecipes: picked
				.map((p) => ({
					recipeId: p.recipeId,
					servings: p.servings,
					title: p.title,
					heroImage: p.heroImage,
				}))
				.sort((a, b) => a.title.localeCompare(b.title)),
			aggregated,
			manual,
		};
	});

export const setShoppingRecipeFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			recipeId: z.string().min(1),
			servings: z.number().int().min(1).max(100),
		}),
	)
	.handler(async ({ data }) => {
		const existing = db
			.select({ recipeId: shoppingRecipes.recipeId })
			.from(shoppingRecipes)
			.where(eq(shoppingRecipes.recipeId, data.recipeId))
			.get();
		if (existing) {
			db.update(shoppingRecipes)
				.set({ servings: data.servings })
				.where(eq(shoppingRecipes.recipeId, data.recipeId))
				.run();
		} else {
			db.insert(shoppingRecipes)
				.values({ recipeId: data.recipeId, servings: data.servings })
				.run();
		}
		return { ok: true };
	});

export const removeShoppingRecipeFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ recipeId: z.string().min(1) }))
	.handler(async ({ data }) => {
		db.delete(shoppingRecipes)
			.where(eq(shoppingRecipes.recipeId, data.recipeId))
			.run();
		return { ok: true };
	});

export const setAggregateCheckedFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ key: z.string().min(1), checked: z.boolean() }))
	.handler(async ({ data }) => {
		if (data.checked) {
			db.insert(shoppingChecks)
				.values({ key: data.key })
				.onConflictDoNothing()
				.run();
		} else {
			db.delete(shoppingChecks).where(eq(shoppingChecks.key, data.key)).run();
		}
		return { ok: true };
	});

export const toggleManualItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string(), checked: z.boolean() }))
	.handler(async ({ data }) => {
		db.update(shoppingItems)
			.set({ checked: data.checked })
			.where(eq(shoppingItems.id, data.id))
			.run();
		return { ok: true };
	});

export const addManualItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(
		z.object({
			ingredientName: z.string().min(1).max(120),
			quantity: z.number().nullable().optional(),
			unit: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const id = crypto.randomUUID();
		db.insert(shoppingItems)
			.values({
				id,
				ingredientName: data.ingredientName.trim(),
				quantity: data.quantity ?? null,
				unit: data.unit ?? null,
				checked: false,
			})
			.run();
		return { id };
	});

export const deleteManualItemFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		db.delete(shoppingItems).where(eq(shoppingItems.id, data.id)).run();
		return { ok: true };
	});

export const clearShoppingFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.handler(async () => {
		db.delete(shoppingRecipes).run();
		db.delete(shoppingChecks).run();
		db.delete(shoppingItems).run();
		return { ok: true };
	});
