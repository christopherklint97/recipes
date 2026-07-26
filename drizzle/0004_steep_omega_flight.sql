ALTER TABLE `meal_prep_items` ADD `servings` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
UPDATE `meal_prep_items`
SET `servings` = min(100, max(1, CAST(trim(`amount`) AS integer)))
WHERE (lower(`amount`) LIKE '%portion%' OR lower(`amount`) LIKE '%serving%')
	AND CAST(trim(`amount`) AS integer) BETWEEN 1 AND 100;
--> statement-breakpoint
UPDATE `meal_prep_items`
SET `amount` = NULL
WHERE lower(trim(`amount`)) IN (
	CAST(`servings` AS text) || ' portion',
	CAST(`servings` AS text) || ' portions',
	CAST(`servings` AS text) || ' serving',
	CAST(`servings` AS text) || ' servings'
);