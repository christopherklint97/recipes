import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		transaction: vi.fn(),
	},
}));

vi.mock("../../db/index.ts", () => ({ db: mocks.db }));

import {
	assertConfiguredWeekStart,
	updateAppSettings,
} from "../settings-store.server.ts";

function selectResult<T>({ get, all }: { get?: T; all?: T[] }) {
	const chain = {
		from: vi.fn(() => chain),
		where: vi.fn(() => chain),
		get: vi.fn(() => get),
		all: vi.fn(() => all ?? []),
	};
	return chain;
}

function writeResult() {
	const chain = {
		values: vi.fn(() => chain),
		onConflictDoNothing: vi.fn(() => chain),
		onConflictDoUpdate: vi.fn(() => chain),
		run: vi.fn(),
	};
	return chain;
}

function transactionFor(
	currentWeekStartsOn: "sunday" | "monday",
	weekStarts: string[],
) {
	const setting = selectResult({ get: { weekStartsOn: currentWeekStartsOn } });
	const plans = selectResult({
		all: weekStarts.map((weekStart) => ({ weekStart })),
	});
	const settingWrite = writeResult();
	const tx = {
		select: vi.fn().mockReturnValueOnce(setting).mockReturnValueOnce(plans),
		insert: vi.fn(() => settingWrite),
		run: vi.fn(),
	};
	mocks.db.transaction.mockImplementationOnce(
		(callback: (transaction: typeof tx) => unknown) => callback(tx),
	);
	return { tx, settingWrite };
}

beforeEach(() => vi.clearAllMocks());

describe("configured meal-prep week starts", () => {
	it("rejects a stale weekday at the server persistence boundary", () => {
		mocks.db.select.mockReturnValueOnce(
			selectResult({ get: { weekStartsOn: "sunday" } }),
		);

		expect(() => assertConfiguredWeekStart("2026-08-03")).toThrow("Sunday");
	});
});

describe("updating app week-start settings", () => {
	it("reads the setting and compares it inside the shift transaction", () => {
		const { tx } = transactionFor("sunday", ["2026-08-02"]);

		updateAppSettings({ weekStartsOn: "monday" });

		expect(mocks.db.select).not.toHaveBeenCalled();
		expect(tx.select).toHaveBeenCalledTimes(2);
		expect(tx.run).toHaveBeenCalledOnce();
	});

	it.each([
		["an unrelated weekday", ["2026-08-02", "2026-08-04"]],
		["a conflicting target weekday", ["2026-08-02", "2026-08-03"]],
	])("rejects %s before shifting any rows", (_label, weekStarts) => {
		const { tx, settingWrite } = transactionFor("sunday", weekStarts);

		expect(() => updateAppSettings({ weekStartsOn: "monday" })).toThrow(
			"do not match",
		);
		expect(tx.run).not.toHaveBeenCalled();
		expect(settingWrite.run).not.toHaveBeenCalled();
	});

	it("restricts the shift update to the old configured weekday", () => {
		const { tx } = transactionFor("sunday", ["2026-08-02"]);

		updateAppSettings({ weekStartsOn: "monday" });

		const statement = tx.run.mock.calls[0][0] as {
			queryChunks: Array<{ value?: string[] } | string>;
		};
		const sqlText = statement.queryChunks
			.flatMap((chunk) =>
				typeof chunk === "string" ? [chunk] : (chunk.value ?? []),
			)
			.join("");
		expect(sqlText).toContain("WHERE strftime('%w', week_start) =");
		expect(statement.queryChunks).toContain("0");
	});
});
