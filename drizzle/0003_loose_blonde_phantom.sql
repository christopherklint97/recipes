CREATE TABLE `meal_prep_items` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_prep_id` text NOT NULL,
	`title` text NOT NULL,
	`amount` text,
	`note` text,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`meal_prep_id`) REFERENCES `meal_preps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `collections` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH `ranked_collections` AS (
	SELECT `id`, row_number() OVER (ORDER BY `name`, `id`) - 1 AS `position`
	FROM `collections`
)
UPDATE `collections`
SET `position` = (
	SELECT `position`
	FROM `ranked_collections`
	WHERE `ranked_collections`.`id` = `collections`.`id`
);
--> statement-breakpoint
CREATE INDEX `collections_position_idx` ON `collections` (`position`);
--> statement-breakpoint
CREATE INDEX `meal_prep_items_meal_prep_added_idx` ON `meal_prep_items` (`meal_prep_id`, `added_at`);