import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const timestamps = {
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
};

export const recipes = sqliteTable("recipes", {
	id: id(),
	title: text().notNull(),
	description: text(),
	sourceUrl: text("source_url"),
	sourceType: text("source_type", {
		enum: ["manual", "url", "ocr", "social"],
	})
		.notNull()
		.default("manual"),
	heroImage: text("hero_image"),
	servings: integer().notNull().default(2),
	prepMinutes: integer("prep_minutes"),
	cookMinutes: integer("cook_minutes"),
	caloriesPerServing: integer("calories_per_serving"),
	costEstimateCents: integer("cost_estimate_cents"),
	notes: text(),
	rawImport: text("raw_import"),
	...timestamps,
});

export const ingredients = sqliteTable("ingredients", {
	id: id(),
	recipeId: text("recipe_id")
		.notNull()
		.references(() => recipes.id, { onDelete: "cascade" }),
	position: integer().notNull(),
	quantity: real(),
	unit: text(),
	name: text().notNull(),
	note: text(),
	groupName: text("group_name"),
});

export const instructions = sqliteTable("instructions", {
	id: id(),
	recipeId: text("recipe_id")
		.notNull()
		.references(() => recipes.id, { onDelete: "cascade" }),
	position: integer().notNull(),
	text: text().notNull(),
	durationSeconds: integer("duration_seconds"),
});

export const tags = sqliteTable("tags", {
	id: id(),
	name: text().notNull().unique(),
});

export const recipeTags = sqliteTable("recipe_tags", {
	recipeId: text("recipe_id")
		.notNull()
		.references(() => recipes.id, { onDelete: "cascade" }),
	tagId: text("tag_id")
		.notNull()
		.references(() => tags.id, { onDelete: "cascade" }),
});

export const collections = sqliteTable("collections", {
	id: id(),
	name: text().notNull(),
	icon: text(),
	coverImage: text("cover_image"),
	...timestamps,
});

export const recipeCollections = sqliteTable("recipe_collections", {
	recipeId: text("recipe_id")
		.notNull()
		.references(() => recipes.id, { onDelete: "cascade" }),
	collectionId: text("collection_id")
		.notNull()
		.references(() => collections.id, { onDelete: "cascade" }),
	addedAt: integer("added_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const shoppingItems = sqliteTable("shopping_items", {
	id: id(),
	ingredientName: text("ingredient_name").notNull(),
	quantity: real(),
	unit: text(),
	checked: integer({ mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const shoppingRecipes = sqliteTable("shopping_recipes", {
	recipeId: text("recipe_id")
		.primaryKey()
		.references(() => recipes.id, { onDelete: "cascade" }),
	servings: integer().notNull().default(2),
	addedAt: integer("added_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

export const shoppingChecks = sqliteTable("shopping_checks", {
	key: text().primaryKey(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type Instruction = typeof instructions.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
