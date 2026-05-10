export function formatQuantity(value: number): string {
	if (Number.isInteger(value)) return String(value);
	const rounded = Math.round(value * 100) / 100;
	if (Number.isInteger(rounded)) return String(rounded);
	return rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function formatSeconds(s: number): string {
	const m = Math.floor(s / 60);
	const sec = s % 60;
	return `${m}:${sec.toString().padStart(2, "0")}`;
}
