import { sql } from "drizzle-orm";
import {
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

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
	position: integer().notNull().default(0),
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

export const mealPreps = sqliteTable(
	"meal_preps",
	{
		id: id(),
		// Kept for backwards-compatible storage; the UI derives plan labels from weekStart.
		name: text().notNull(),
		weekStart: text("week_start").notNull(),
		...timestamps,
	},
	(table) => [uniqueIndex("meal_preps_week_start_unique").on(table.weekStart)],
);

export const mealPrepRecipes = sqliteTable(
	"meal_prep_recipes",
	{
		mealPrepId: text("meal_prep_id")
			.notNull()
			.references(() => mealPreps.id, { onDelete: "cascade" }),
		recipeId: text("recipe_id")
			.notNull()
			.references(() => recipes.id, { onDelete: "cascade" }),
		servings: integer().notNull().default(2),
		addedAt: integer("added_at", { mode: "timestamp" })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [primaryKey({ columns: [table.mealPrepId, table.recipeId] })],
);

export const mealPrepItems = sqliteTable("meal_prep_items", {
	id: id(),
	mealPrepId: text("meal_prep_id")
		.notNull()
		.references(() => mealPreps.id, { onDelete: "cascade" }),
	title: text().notNull(),
	servings: integer().notNull().default(2),
	image: text(),
	amount: text(),
	note: text(),
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
export type MealPrep = typeof mealPreps.$inferSelect;
export type MealPrepItem = typeof mealPrepItems.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
