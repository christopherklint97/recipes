CREATE TABLE `meal_prep_recipes` (
	`meal_prep_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`servings` integer DEFAULT 2 NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`meal_prep_id`, `recipe_id`),
	FOREIGN KEY (`meal_prep_id`) REFERENCES `meal_preps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meal_preps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`week_start` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
