import { describe, expect, it, vi } from "vitest";
import {
	emitShoppingChanged,
	subscribeToShoppingChanges,
} from "./shopping-events.ts";

describe("shopping events", () => {
	it("notifies every active viewer and stops after unsubscribe", () => {
		const first = vi.fn();
		const second = vi.fn();
		const unsubscribeFirst = subscribeToShoppingChanges(first);
		const unsubscribeSecond = subscribeToShoppingChanges(second);

		emitShoppingChanged();
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();

		unsubscribeFirst();
		emitShoppingChanged();
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledTimes(2);

		unsubscribeSecond();
	});

	it("does not let a disconnected viewer break updates for everyone else", () => {
		const disconnected = vi.fn(() => {
			throw new Error("stream closed");
		});
		const active = vi.fn();
		subscribeToShoppingChanges(disconnected);
		const unsubscribeActive = subscribeToShoppingChanges(active);

		expect(() => emitShoppingChanged()).not.toThrow();
		emitShoppingChanged();
		expect(disconnected).toHaveBeenCalledOnce();
		expect(active).toHaveBeenCalledTimes(2);

		unsubscribeActive();
	});
});
