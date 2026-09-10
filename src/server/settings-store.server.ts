import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { appSettings, mealPreps } from "../db/schema.ts";
import {
	DEFAULT_WEEK_START,
	isWeekStart,
	type WeekStartsOn,
	weekStartDelta,
} from "../lib/week.ts";

const SETTINGS_ID = "app";
type SettingsStore = Pick<typeof db, "select" | "insert">;

export function readAppSettings(database: SettingsStore = db): {
	weekStartsOn: WeekStartsOn;
} {
	const existing = database
		.select({ weekStartsOn: appSettings.weekStartsOn })
		.from(appSettings)
		.where(eq(appSettings.id, SETTINGS_ID))
		.get();
	if (existing) return existing;

	database
		.insert(appSettings)
		.values({ id: SETTINGS_ID, weekStartsOn: DEFAULT_WEEK_START })
		.onConflictDoNothing({ target: appSettings.id })
		.run();
	return (
		database
			.select({ weekStartsOn: appSettings.weekStartsOn })
			.from(appSettings)
			.where(eq(appSettings.id, SETTINGS_ID))
			.get() ?? { weekStartsOn: DEFAULT_WEEK_START }
	);
}

export function assertConfiguredWeekStart(weekStart: string): void {
	const { weekStartsOn } = readAppSettings();
	if (isWeekStart(weekStart, weekStartsOn)) return;
	const weekday = weekStartsOn === "sunday" ? "Sunday" : "Monday";
	throw new Error(`Week start must be a valid ${weekday}`);
}

export function updateAppSettings(data: { weekStartsOn: WeekStartsOn }): {
	weekStartsOn: WeekStartsOn;
} {
	db.transaction((tx) => {
		const current = readAppSettings(tx);
		const delta = weekStartDelta(current.weekStartsOn, data.weekStartsOn);

		if (delta !== 0) {
			const storedWeeks = tx
				.select({ weekStart: mealPreps.weekStart })
				.from(mealPreps)
				.all();
			if (
				storedWeeks.some(
					({ weekStart }) => !isWeekStart(weekStart, current.weekStartsOn),
				)
			) {
				throw new Error(
					"Existing meal plan week starts do not match the configured weekday",
				);
			}

			const modifier = `${delta > 0 ? "+" : ""}${delta} day`;
			const oldWeekday = current.weekStartsOn === "sunday" ? "0" : "1";
			tx.run(sql`
				UPDATE ${mealPreps}
				SET
					name = CASE
						WHEN name = 'Plan for ' || week_start
						THEN 'Plan for ' || date(week_start, ${modifier})
						ELSE name
					END,
					week_start = date(week_start, ${modifier}),
					updated_at = unixepoch()
				WHERE strftime('%w', week_start) = ${oldWeekday}
			`);
		}

		tx.insert(appSettings)
			.values({
				id: SETTINGS_ID,
				weekStartsOn: data.weekStartsOn,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: appSettings.id,
				set: {
					weekStartsOn: data.weekStartsOn,
					updatedAt: new Date(),
				},
			})
			.run();
	});

	return { weekStartsOn: data.weekStartsOn };
}
