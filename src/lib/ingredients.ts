const VULGAR_FRACTIONS: Record<string, string> = {
	"¼": "1/4",
	"½": "1/2",
	"¾": "3/4",
	"⅐": "1/7",
	"⅑": "1/9",
	"⅒": "1/10",
	"⅓": "1/3",
	"⅔": "2/3",
	"⅕": "1/5",
	"⅖": "2/5",
	"⅗": "3/5",
	"⅘": "4/5",
	"⅙": "1/6",
	"⅚": "5/6",
	"⅛": "1/8",
	"⅜": "3/8",
	"⅝": "5/8",
	"⅞": "7/8",
};

function expandVulgarFractions(input: string): string {
	return input.replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (fraction, offset) => {
		const expanded = VULGAR_FRACTIONS[fraction];
		return offset > 0 && /\d/.test(input[offset - 1])
			? ` ${expanded}`
			: expanded;
	});
}

/** Parse a decimal, decimal comma, simple fraction, or mixed fraction. */
export function parseQuantity(input: string): number | null {
	const normalized = expandVulgarFractions(input)
		.replace(/\u00a0/g, " ")
		.replace(/\s*\/\s*/g, "/")
		.trim();
	if (!normalized) return null;

	const parts = normalized.split(/\s+/);
	if (parts.length > 2) return null;
	if (
		parts.length === 2 &&
		(!/^\d+(?:[.,]\d+)?$/.test(parts[0]) || !/^\d+\/\d+$/.test(parts[1]))
	) {
		return null;
	}

	let total = 0;
	for (const part of parts) {
		if (part.includes("/")) {
			const fractionParts = part.split("/");
			if (fractionParts.length !== 2) return null;
			const numerator = Number(fractionParts[0]);
			const denominator = Number(fractionParts[1]);
			if (!Number.isFinite(numerator) || denominator <= 0) return null;
			total += numerator / denominator;
			continue;
		}

		const number = Number(part.replace(",", "."));
		if (!Number.isFinite(number)) return null;
		total += number;
	}
	return total;
}

interface UnitDefinition {
	aliases: string[];
	unit: string;
	multiplier?: number;
}

const UNIT_DEFINITIONS: UnitDefinition[] = [
	{ aliases: ["matskedar", "matsked", "msk", "tbsp"], unit: "tbsp" },
	{ aliases: ["teskedar", "tesked", "tsk", "tsp"], unit: "tsp" },
	{
		aliases: ["kryddmått", "kryddmatt", "krm"],
		unit: "ml",
	},
	{ aliases: ["deciliter", "dl"], unit: "ml", multiplier: 100 },
	{ aliases: ["centiliter", "cl"], unit: "ml", multiplier: 10 },
	{ aliases: ["hektogram", "hg"], unit: "g", multiplier: 100 },
	{ aliases: ["kilogram", "kilo", "kg"], unit: "kg" },
	{ aliases: ["milligram", "mg"], unit: "mg" },
	{ aliases: ["gram", "g"], unit: "g" },
	{ aliases: ["milliliter", "ml"], unit: "ml" },
	{ aliases: ["liter", "litre", "l"], unit: "l" },
	{ aliases: ["ounces", "ounce", "oz"], unit: "oz" },
	{ aliases: ["pounds", "pound", "lbs", "lb"], unit: "lb" },
	{ aliases: ["cups", "cup"], unit: "cup" },
	{ aliases: ["nypor", "nypa", "pinches", "pinch"], unit: "pinch" },
	{
		aliases: [
			"vitlöksklyftor",
			"vitlöksklyfta",
			"klyftor",
			"klyfta",
			"cloves",
			"clove",
		],
		unit: "clove",
	},
	{
		aliases: ["stycken", "styck", "st", "pieces", "piece", "pcs"],
		unit: "pcs",
	},
	{ aliases: ["skivor", "skiva", "slices", "slice"], unit: "slice" },
];

const UNIT_BY_ALIAS = new Map(
	UNIT_DEFINITIONS.flatMap((definition) =>
		definition.aliases.map((alias) => [alias, definition] as const),
	),
);
const UNIT_PATTERN = Array.from(UNIT_BY_ALIAS.keys())
	.sort((a, b) => b.length - a.length)
	.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
	.join("|");
const QUANTITY_PREFIX =
	/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|\d*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*(.*)$/;
const UNIT_PREFIX = new RegExp(`^(${UNIT_PATTERN})(?:\\.|\\b)\\s*(.*)$`, "iu");

export interface ParsedIngredient {
	quantity: number | null;
	unit: string | null;
	name: string;
	note: string | null;
}

export function parseIngredientLine(line: string): ParsedIngredient {
	const trimmed = line.replace(/\s+/g, " ").trim();
	const quantityMatch = trimmed.match(QUANTITY_PREFIX);
	if (!quantityMatch) {
		return { quantity: null, unit: null, name: trimmed, note: null };
	}

	let quantity = parseQuantity(quantityMatch[1]);
	const rest = quantityMatch[2].trim();
	const unitMatch = rest.match(UNIT_PREFIX);
	if (!unitMatch) {
		return { quantity, unit: null, name: rest, note: null };
	}

	const definition = UNIT_BY_ALIAS.get(unitMatch[1].toLocaleLowerCase("sv-SE"));
	if (!definition) {
		return { quantity, unit: null, name: rest, note: null };
	}
	if (quantity !== null && definition.multiplier) {
		quantity *= definition.multiplier;
	}

	return {
		quantity,
		unit: definition.unit,
		name: unitMatch[2].trim() || rest,
		note: null,
	};
}
