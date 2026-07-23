import { decodeHtmlText } from "./html-text.ts";
import { parseIngredientLine } from "./ingredients.ts";

const INGREDIENT_HEADING = /\b(ingredients?|ingredienser)\b/i;
const INSTRUCTION_HEADING =
	/\b(instructions?|directions?|method|tillagning|g[oö]r\s+s[aå]\s+h[aä]r)\b/i;
const QUANTITY_LINE =
	/^[|Il!]?\s*(?:\d+(?:[.,]\d+)?|\d+\s+\d+\/\d+|\d+\/\d+|[¼½¾⅓⅔])\s*(?:kg|hg|g|mg|l|dl|cl|ml|msk|tsk|krm|tbsp|tsp|st|st\.|stycken?|klyftor?|skivor?|burk(?:ar)?|paket)?\b/i;
const SERVINGS = /\b(\d{1,3})\s*(?:portioner|servings?|pers(?:oner)?)\b/i;
const DURATION = /\b(?:cirka|ca|about)?\s*(\d{1,3})\s*min(?:uter|utes?)?\b/i;
const CALORIES = /\b(\d{2,4})\s*kcal\b/i;
const STEP_MARKER = /(?:^|\s)(\d{1,2})[.)]\s+/g;

export interface ParsedPhotoRecipe {
	title: string;
	sourceType: "ocr" | "url";
	description: string | null;
	sourceUrl: string | null;
	heroImage: string | null;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	caloriesPerServing: number | null;
	ingredients: Array<{
		name: string;
		quantity: number | null;
		unit: string | null;
		note: string | null;
		position: number;
	}>;
	instructions: Array<{
		text: string;
		position: number;
		durationSeconds: number | null;
	}>;
	rawText: string;
}

function cleanOcrText(value: string): string {
	return decodeHtmlText(value)
		.normalize("NFC")
		.replace(/\r/g, "")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function splitNumberedSteps(line: string): {
	prefix: string;
	steps: string[];
} {
	const matches = [...line.matchAll(STEP_MARKER)];
	if (matches.length === 0) return { prefix: line, steps: [] };
	const prefix = line.slice(0, matches[0].index).trim();
	const steps = matches.map((match, index) => {
		const start = (match.index ?? 0) + match[0].length;
		const end = matches[index + 1]?.index ?? line.length;
		return line.slice(start, end).trim();
	});
	return { prefix, steps: steps.filter(Boolean) };
}

function isLikelyIngredient(line: string): boolean {
	return QUANTITY_LINE.test(line) && !SERVINGS.test(line);
}

export function parsePhotoRecipeText(value: string): ParsedPhotoRecipe {
	const rawText = cleanOcrText(value);
	const lines = rawText
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const headingIndex = lines.findIndex(
		(line) => INGREDIENT_HEADING.test(line) || INSTRUCTION_HEADING.test(line),
	);
	const titleCandidate = lines
		.slice(0, headingIndex < 0 ? Math.min(lines.length, 3) : headingIndex)
		.find((line) => !SERVINGS.test(line) && !QUANTITY_LINE.test(line));
	const servings = Number(rawText.match(SERVINGS)?.[1] ?? 2);
	const ingredientLines: string[] = [];
	const instructionTexts: string[] = [];
	let section: "unknown" | "ingredients" | "instructions" = "unknown";

	for (const originalLine of lines) {
		const hasIngredientsHeading = INGREDIENT_HEADING.test(originalLine);
		const hasInstructionsHeading = INSTRUCTION_HEADING.test(originalLine);
		if (hasIngredientsHeading || hasInstructionsHeading) {
			section = hasInstructionsHeading ? "instructions" : "ingredients";
			continue;
		}
		if (originalLine === titleCandidate || SERVINGS.test(originalLine))
			continue;

		const { prefix, steps } = splitNumberedSteps(originalLine);
		if (steps.length > 0) {
			if (prefix && isLikelyIngredient(prefix)) ingredientLines.push(prefix);
			for (const step of steps) instructionTexts.push(step);
			section = "instructions";
			continue;
		}

		if (isLikelyIngredient(originalLine)) {
			ingredientLines.push(originalLine.replace(/^[|Il!]\s+(?=\d)/, ""));
			continue;
		}
		if (section === "ingredients") {
			ingredientLines.push(originalLine);
			continue;
		}
		if (section === "instructions") {
			const previous = instructionTexts.at(-1);
			if (previous && !/[.!?]$/.test(previous)) {
				instructionTexts[instructionTexts.length - 1] =
					`${previous} ${originalLine}`;
			} else {
				instructionTexts.push(originalLine);
			}
		}
	}

	return {
		title: titleCandidate ?? "Imported from photo",
		sourceType: "ocr",
		description: null,
		sourceUrl: null,
		heroImage: null,
		servings: Number.isFinite(servings) && servings > 0 ? servings : 2,
		prepMinutes: null,
		cookMinutes: Number(rawText.match(DURATION)?.[1]) || null,
		caloriesPerServing: Number(rawText.match(CALORIES)?.[1]) || null,
		ingredients: ingredientLines.map((line, position) => ({
			...parseIngredientLine(line),
			note: null,
			position,
		})),
		instructions: instructionTexts.map((text, position) => ({
			text,
			position,
			durationSeconds: null,
		})),
		rawText,
	};
}
