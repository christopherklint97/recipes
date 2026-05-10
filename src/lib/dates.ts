function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Week starts Monday.
export function startOfWeek(d: Date): Date {
	const out = new Date(d);
	out.setHours(0, 0, 0, 0);
	const day = out.getDay();
	const diff = (day + 6) % 7;
	out.setDate(out.getDate() - diff);
	return out;
}

export function addDays(d: Date, n: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + n);
	return out;
}

export function weekDays(start: Date): string[] {
	return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(start, i)));
}

export function isoWeekKey(d: Date): string {
	const start = startOfWeek(d);
	return toIsoDate(start);
}

export function formatWeekday(date: string): string {
	const [y, m, d] = date.split("-").map(Number);
	const dt = new Date(y, m - 1, d);
	return dt.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDay(date: string): string {
	const [y, m, d] = date.split("-").map(Number);
	const dt = new Date(y, m - 1, d);
	return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
