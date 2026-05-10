import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authedMiddleware } from "../auth/middleware.ts";
import { scrapeRecipeFromUrl } from "../scrape/jsonld.ts";
import { scrapeSocial } from "../scrape/social.ts";

const urlInput = z.object({ url: z.string().url() });

export const importFromUrlFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(urlInput)
	.handler(async ({ data }) => {
		try {
			return { ok: true as const, recipe: await scrapeRecipeFromUrl(data.url) };
		} catch (err) {
			return {
				ok: false as const,
				error: err instanceof Error ? err.message : "scrape failed",
			};
		}
	});

export const importFromSocialFn = createServerFn({ method: "POST" })
	.middleware([authedMiddleware])
	.inputValidator(urlInput)
	.handler(async ({ data }) => {
		try {
			return { ok: true as const, social: await scrapeSocial(data.url) };
		} catch (err) {
			return {
				ok: false as const,
				error: err instanceof Error ? err.message : "fetch failed",
			};
		}
	});
