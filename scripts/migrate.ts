import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const dbPath = process.env.DATABASE_URL ?? "dev.db";
console.log(`[migrate] applying migrations to ${dbPath}`);

const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL");

const hasLegacyMealPlan = sqlite
	.query<
		{ name: string },
		[]
	>(`SELECT name FROM sqlite_master WHERE type='table' AND name='meal_plan_entries'`)
	.get();

if (hasLegacyMealPlan) {
	console.log("[migrate] legacy meal-plan schema detected, upgrading in place");
	const sql = readFileSync("./drizzle/0001_drop_meal_plan.sql", "utf8");
	for (const stmt of sql.split("--> statement-breakpoint")) {
		const trimmed = stmt.trim();
		if (trimmed) sqlite.exec(trimmed);
	}
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS __drizzle_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT NOT NULL,
			created_at NUMERIC
		);
	`);
	sqlite.exec(`DELETE FROM __drizzle_migrations`);
	sqlite
		.prepare(
			`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
		)
		.run("legacy-0000-striped-giant-man", 1778427358414);
	sqlite
		.prepare(
			`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
		)
		.run("legacy-0001-drop-meal-plan", 1778427400000);
	console.log("[migrate] legacy upgrade complete");
}

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();

console.log("[migrate] done");
