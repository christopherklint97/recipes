type ShoppingListener = () => void;

type ShoppingEventGlobal = typeof globalThis & {
	__recipesShoppingListeners?: Set<ShoppingListener>;
};

const globalEvents = globalThis as ShoppingEventGlobal;
const listeners =
	globalEvents.__recipesShoppingListeners ?? new Set<ShoppingListener>();
if (!globalEvents.__recipesShoppingListeners) {
	globalEvents.__recipesShoppingListeners = listeners;
}

export function emitShoppingChanged(): void {
	for (const listener of listeners) {
		try {
			listener();
		} catch {
			listeners.delete(listener);
		}
	}
}

export function subscribeToShoppingChanges(
	listener: ShoppingListener,
): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
