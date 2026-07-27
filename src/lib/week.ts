export function isIsoWeekStart(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return (
		!Number.isNaN(date.getTime()) &&
		date.toISOString().slice(0, 10) === value &&
		date.getUTCDay() === 1
	);
}

export function weekStartFromOffset(offset = 0, today = new Date()): string {
	const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const day = date.getDay();
	date.setDate(date.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
	return toDateInput(date);
}

export function toDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function normalizeToWeekStart(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return weekStartFromOffset();
	return weekStartFromOffset(0, new Date(year, month - 1, day));
}

export function shiftWeekStart(value: string, weeks: number): string {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + weeks * 7);
	return toDateInput(date);
}

export function getIsoWeek(value: string): { week: number; year: number } {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	const weekday = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - weekday);
	const isoYear = date.getUTCFullYear();
	const yearStart = new Date(Date.UTC(isoYear, 0, 1));
	const week = Math.ceil(
		((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);
	return { week, year: isoYear };
}

export function formatWeek(value: string): string {
	const { week, year } = getIsoWeek(value);
	return `Week ${week}, ${year}`;
}

export function formatWeekRange(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	const start = new Date(year, month - 1, day);
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	const format = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	});
	return `${format.format(start)}–${format.format(end)}`;
}
