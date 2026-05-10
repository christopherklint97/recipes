DROP TABLE `meal_plan_entries`;
--> statement-breakpoint
DELETE FROM `shopping_items` WHERE `manual` = 0;
--> statement-breakpoint
ALTER TABLE `shopping_items` DROP COLUMN `manual`;
--> statement-breakpoint
ALTER TABLE `shopping_items` DROP COLUMN `plan_week`;
--> statement-breakpoint
CREATE TABLE `shopping_recipes` (
	`recipe_id` text PRIMARY KEY NOT NULL,
	`servings` integer DEFAULT 2 NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shopping_checks` (
	`key` text PRIMARY KEY NOT NULL
);
