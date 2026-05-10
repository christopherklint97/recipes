export function parseIsoDurationToMinutes(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
	if (!match) return null;
	const hours = match[1] ? Number(match[1]) : 0;
	const minutes = match[2] ? Number(match[2]) : 0;
	const seconds = match[3] ? Number(match[3]) : 0;
	const total = hours * 60 + minutes + Math.round(seconds / 60);
	return total > 0 ? total : null;
}

export function parseServings(value: unknown): number | null {
	if (typeof value === "number") return Math.max(1, Math.round(value));
	if (typeof value === "string") {
		const m = value.match(/\d+/);
		if (m) return Math.max(1, Number(m[0]));
	}
	if (Array.isArray(value)) {
		for (const v of value) {
			const out = parseServings(v);
			if (out) return out;
		}
	}
	return null;
}

export function parseCalories(value: unknown): number | null {
	if (typeof value === "number") return Math.round(value);
	if (typeof value === "string") {
		const m = value.match(/\d+/);
		if (m) return Number(m[0]);
	}
	if (value && typeof value === "object") {
		const cal = (value as Record<string, unknown>).calories;
		return parseCalories(cal);
	}
	return null;
}
