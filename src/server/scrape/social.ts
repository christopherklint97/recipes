export interface ScrapedSocial {
	sourceUrl: string;
	title: string;
	description: string | null;
	heroImage: string | null;
	caption: string | null;
	platform: "instagram" | "tiktok" | "facebook" | "other";
}

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
	"Mozilla/5.0 (compatible; RecipesBot/1.0; +https://recipes.christopherklint.com)";

function platformFromUrl(url: string): ScrapedSocial["platform"] {
	const host = (() => {
		try {
			return new URL(url).hostname.replace(/^www\./, "");
		} catch {
			return "";
		}
	})();
	if (host.endsWith("instagram.com")) return "instagram";
	if (host.endsWith("tiktok.com")) return "tiktok";
	if (host.endsWith("facebook.com") || host.endsWith("fb.watch")) {
		return "facebook";
	}
	return "other";
}

function decodeHtmlEntities(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
}

function pickMeta(
	html: string,
	key: "property" | "name",
	value: string,
): string | null {
	const re = new RegExp(
		`<meta[^>]+${key}\\s*=\\s*["']${value}["'][^>]+content\\s*=\\s*["']([^"']+)["']`,
		"i",
	);
	const m = html.match(re);
	if (m) return decodeHtmlEntities(m[1]);
	const reReverse = new RegExp(
		`<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]+${key}\\s*=\\s*["']${value}["']`,
		"i",
	);
	const m2 = html.match(reReverse);
	return m2 ? decodeHtmlEntities(m2[1]) : null;
}

export async function scrapeSocial(url: string): Promise<ScrapedSocial> {
	const platform = platformFromUrl(url);
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

	const ogTitle =
		pickMeta(html, "property", "og:title") ??
		pickMeta(html, "name", "twitter:title");
	const ogDescription =
		pickMeta(html, "property", "og:description") ??
		pickMeta(html, "name", "description") ??
		pickMeta(html, "name", "twitter:description");
	const ogImage =
		pickMeta(html, "property", "og:image") ??
		pickMeta(html, "name", "twitter:image");

	return {
		sourceUrl: url,
		title: ogTitle ?? new URL(url).hostname,
		description: ogDescription,
		heroImage: ogImage,
		caption: ogDescription,
		platform,
	};
}
