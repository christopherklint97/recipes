ALTER TABLE `meal_prep_items` ADD `cooked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_prep_items` ADD `position` integer;--> statement-breakpoint
ALTER TABLE `meal_prep_recipes` ADD `cooked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `meal_prep_recipes` ADD `position` integer;