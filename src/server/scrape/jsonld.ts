import {
	parseCalories,
	parseIsoDurationToMinutes,
	parseServings,
} from "./duration.ts";

export interface ScrapedRecipe {
	title: string;
	description: string | null;
	heroImage: string | null;
	sourceUrl: string;
	servings: number;
	prepMinutes: number | null;
	cookMinutes: number | null;
	caloriesPerServing: number | null;
	ingredients: Array<{
		position: number;
		name: string;
		quantity: number | null;
		unit: string | null;
		note: string | null;
		groupName: string | null;
	}>;
	instructions: Array<{
		position: number;
		text: string;
		durationSeconds: number | null;
	}>;
}

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
	"Mozilla/5.0 (compatible; RecipesBot/1.0; +https://recipes.christopherklint.com)";

function decodeHtmlEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ")
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
			String.fromCodePoint(Number.parseInt(h, 16)),
		)
		.replace(/&#(\d+);/g, (_, n) =>
			String.fromCodePoint(Number.parseInt(n, 10)),
		);
}

function extractLdJsonScripts(html: string): string[] {
	const out: string[] = [];
	const pattern =
		/<script\b[^>]*type\s*=\s*['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi;
	let m: RegExpExecArray | null;
	m = pattern.exec(html);
	while (m !== null) {
		out.push(m[1]);
		m = pattern.exec(html);
	}
	return out;
}

function isRecipe(node: unknown): node is Record<string, unknown> {
	if (!node || typeof node !== "object") return false;
	const t = (node as Record<string, unknown>)["@type"];
	if (typeof t === "string") return t.toLowerCase() === "recipe";
	if (Array.isArray(t))
		return t.some((x) => String(x).toLowerCase() === "recipe");
	return false;
}

function findRecipeNode(value: unknown): Record<string, unknown> | null {
	if (Array.isArray(value)) {
		for (const v of value) {
			const found = findRecipeNode(v);
			if (found) return found;
		}
		return null;
	}
	if (value && typeof value === "object") {
		if (isRecipe(value)) return value as Record<string, unknown>;
		const obj = value as Record<string, unknown>;
		const graph = obj["@graph"];
		if (Array.isArray(graph)) {
			const found = findRecipeNode(graph);
			if (found) return found;
		}
		for (const v of Object.values(obj)) {
			if (v && typeof v === "object") {
				const found = findRecipeNode(v);
				if (found) return found;
			}
		}
	}
	return null;
}

function asString(v: unknown): string | null {
	if (typeof v === "string") return v.trim() || null;
	if (Array.isArray(v) && v.length > 0) return asString(v[0]);
	if (v && typeof v === "object") {
		const obj = v as Record<string, unknown>;
		if (typeof obj["@value"] === "string")
			return (obj["@value"] as string).trim();
		if (typeof obj.text === "string") return (obj.text as string).trim();
		if (typeof obj.name === "string") return (obj.name as string).trim();
		if (typeof obj.url === "string") return (obj.url as string).trim();
	}
	return null;
}

function asImageUrl(v: unknown): string | null {
	if (typeof v === "string") return v;
	if (Array.isArray(v) && v.length > 0) return asImageUrl(v[0]);
	if (v && typeof v === "object") {
		const obj = v as Record<string, unknown>;
		if (typeof obj.url === "string") return obj.url;
		if (Array.isArray(obj.url)) return asImageUrl(obj.url);
	}
	return null;
}

function flattenInstructions(value: unknown): string[] {
	if (typeof value === "string") {
		return value
			.split(/(?:\r?\n)+|(?<=[.!?])\s{2,}/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}
	if (Array.isArray(value)) {
		const out: string[] = [];
		for (const v of value) out.push(...flattenInstructions(v));
		return out;
	}
	if (value && typeof value === "object") {
		const obj = value as Record<string, unknown>;
		const t = String(obj["@type"] ?? "").toLowerCase();
		if (t === "howtosection" && obj.itemListElement) {
			return flattenInstructions(obj.itemListElement);
		}
		const text = asString(obj.text) ?? asString(obj.name);
		return text ? [text] : [];
	}
	return [];
}

function flattenIngredients(value: unknown): string[] {
	if (typeof value === "string") return [value.trim()].filter(Boolean);
	if (Array.isArray(value)) {
		const out: string[] = [];
		for (const v of value) {
			const s = asString(v);
			if (s) out.push(s);
		}
		return out;
	}
	return [];
}

function parseIngredientLine(line: string): {
	quantity: number | null;
	unit: string | null;
	name: string;
	note: string | null;
} {
	const trimmed = line.replace(/\s+/g, " ").trim();
	const m = trimmed.match(
		/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|\d+\s+\d+\/\d+)\s*(.*)$/,
	);
	if (!m) return { quantity: null, unit: null, name: trimmed, note: null };

	let qty: number | null = null;
	const raw = m[1].replace(",", ".");
	if (raw.includes("/")) {
		const parts = raw.split(/\s+/);
		let total = 0;
		for (const p of parts) {
			if (p.includes("/")) {
				const [n, d] = p.split("/").map(Number);
				if (n && d) total += n / d;
			} else {
				total += Number(p);
			}
		}
		qty = total || null;
	} else {
		const n = Number(raw);
		qty = Number.isFinite(n) ? n : null;
	}

	const rest = m[2].trim();
	const unitMatch = rest.match(
		/^(g|kg|mg|oz|lb|lbs|ml|l|tsp|tbsp|cup|cups|pinch|clove|cloves|pcs|piece|pieces|slice|slices)\b\.?\s*(.*)$/i,
	);
	if (unitMatch) {
		return {
			quantity: qty,
			unit: unitMatch[1].toLowerCase().replace(/\.$/, ""),
			name: unitMatch[2].trim() || rest,
			note: null,
		};
	}
	return { quantity: qty, unit: null, name: rest, note: null };
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapedRecipe> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	let html: string;
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
			redirect: "follow",
			signal: controller.signal,
		});
		if (!res.ok) {
			throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
		}
		html = await res.text();
	} finally {
		clearTimeout(timer);
	}

	const scripts = extractLdJsonScripts(html);
	if (scripts.length === 0) {
		throw new Error("no JSON-LD found on page");
	}

	let recipeNode: Record<string, unknown> | null = null;
	for (const raw of scripts) {
		try {
			const parsed = JSON.parse(decodeHtmlEntities(raw));
			recipeNode = findRecipeNode(parsed);
			if (recipeNode) break;
		} catch {
			// try next
		}
	}
	if (!recipeNode) {
		throw new Error("no Recipe schema found");
	}

	const title = asString(recipeNode.name) ?? "Untitled";
	const description = asString(recipeNode.description);
	const heroImage = asImageUrl(recipeNode.image);
	const prepMinutes = parseIsoDurationToMinutes(recipeNode.prepTime);
	const cookMinutes = parseIsoDurationToMinutes(recipeNode.cookTime);
	const servings = parseServings(recipeNode.recipeYield) ?? 2;
	const caloriesPerServing = parseCalories(recipeNode.nutrition);

	const ingredientLines = flattenIngredients(recipeNode.recipeIngredient);
	const ingredients = ingredientLines.map((line, position) => {
		const parsed = parseIngredientLine(line);
		return { position, groupName: null, ...parsed };
	});

	const instructionTexts = flattenInstructions(recipeNode.recipeInstructions);
	const instructions = instructionTexts.map((text, position) => ({
		position,
		text,
		durationSeconds: null,
	}));

	return {
		title,
		description,
		heroImage,
		sourceUrl: url,
		servings,
		prepMinutes,
		cookMinutes,
		caloriesPerServing,
		ingredients,
		instructions,
	};
}
