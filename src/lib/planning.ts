export type ShoppingRecipe = {
	id: string;
	servings: number;
};

/** Combines repeated recipes from multiple plans while preserving first-seen order. */
export function aggregateRecipeServings<T extends ShoppingRecipe>(
	recipes: T[],
): T[] {
	const byId = new Map<string, T>();
	for (const recipe of recipes) {
		const existing = byId.get(recipe.id);
		byId.set(
			recipe.id,
			existing
				? { ...existing, servings: existing.servings + recipe.servings }
				: { ...recipe },
		);
	}
	return Array.from(byId.values());
}

/** Builds a literal SQLite LIKE substring pattern by escaping metacharacters. */
export function literalLikeSubstring(value: string): string {
	return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}
