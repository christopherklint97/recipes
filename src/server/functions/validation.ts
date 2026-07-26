import { z } from "zod";

export const manualMealPrepItemInput = z.object({
	mealPrepId: z.string().min(1),
	title: z.string().trim().min(1).max(120),
	servings: z.number().int().min(1).max(100),
	image: z.string().trim().max(2048).nullable().optional(),
	amount: z.string().trim().max(80).nullable().optional(),
	note: z.string().trim().max(300).nullable().optional(),
});

export const reorderCollectionsInput = z
	.object({ ids: z.array(z.string().min(1)).max(200) })
	.superRefine(({ ids }, ctx) => {
		if (new Set(ids).size !== ids.length) {
			ctx.addIssue({
				code: "custom",
				message: "Collection ids must be unique",
			});
		}
	});
