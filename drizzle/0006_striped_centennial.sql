-- Canonicalize legacy dates to the Monday of their represented ISO week.
UPDATE `meal_preps`
SET `week_start` = date(
	`week_start`,
	printf('-%d days', (CAST(strftime('%w', `week_start`) AS integer) + 6) % 7)
);
--> statement-breakpoint
-- Collapse any legacy duplicate named plans into one canonical plan per ISO week.
INSERT OR IGNORE INTO `meal_prep_recipes` (`meal_prep_id`, `recipe_id`, `servings`, `added_at`)
SELECT
	(SELECT MIN(`canonical`.`id`) FROM `meal_preps` AS `canonical` WHERE `canonical`.`week_start` = `duplicate`.`week_start`),
	`items`.`recipe_id`,
	`items`.`servings`,
	`items`.`added_at`
FROM `meal_prep_recipes` AS `items`
INNER JOIN `meal_preps` AS `duplicate` ON `duplicate`.`id` = `items`.`meal_prep_id`;
--> statement-breakpoint
DELETE FROM `meal_prep_recipes`
WHERE `meal_prep_id` NOT IN (
	SELECT MIN(`id`) FROM `meal_preps` GROUP BY `week_start`
);
--> statement-breakpoint
UPDATE `meal_prep_items`
SET `meal_prep_id` = (
	SELECT MIN(`canonical`.`id`)
	FROM `meal_preps` AS `source`
	INNER JOIN `meal_preps` AS `canonical` ON `canonical`.`week_start` = `source`.`week_start`
	WHERE `source`.`id` = `meal_prep_items`.`meal_prep_id`
)
WHERE `meal_prep_id` NOT IN (
	SELECT MIN(`id`) FROM `meal_preps` GROUP BY `week_start`
);
--> statement-breakpoint
DELETE FROM `meal_preps`
WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `meal_preps` GROUP BY `week_start`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meal_preps_week_start_unique` ON `meal_preps` (`week_start`);
