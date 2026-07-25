const FRACTIONS: Array<[number, string]> = [
	[0.125, "⅛"],
	[0.25, "¼"],
	[1 / 3, "⅓"],
	[0.375, "⅜"],
	[0.5, "½"],
	[0.625, "⅝"],
	[2 / 3, "⅔"],
	[0.75, "¾"],
	[0.875, "⅞"],
];

export function scaleQuantity(
	quantity: number | null,
	baseServings: number,
	servings: number,
): number | null {
	if (quantity == null) return null;
	return quantity * (servings / Math.max(1, baseServings));
}

export function formatScaledQuantity(value: number): string {
	const rounded = Math.round(value * 100) / 100;
	const whole = Math.floor(rounded);
	const remainder = rounded - whole;
	const fraction = FRACTIONS.find(
		([decimal]) => Math.abs(remainder - decimal) < 0.025,
	);
	if (fraction) return `${whole || ""}${fraction[1]}`;
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
		rounded,
	);
}
