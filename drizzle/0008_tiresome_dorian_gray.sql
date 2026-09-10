CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY DEFAULT 'app' NOT NULL,
	`week_starts_on` text DEFAULT 'sunday' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `app_settings` (`id`, `week_starts_on`) VALUES ('app', 'sunday');
--> statement-breakpoint
UPDATE `meal_preps`
SET
	`name` = CASE
		WHEN `name` = 'Plan for ' || `week_start`
		THEN 'Plan for ' || date(`week_start`, '-1 day')
		ELSE `name`
	END,
	`week_start` = date(`week_start`, '-1 day'),
	`updated_at` = unixepoch()
WHERE strftime('%w', `week_start`) = '1';
