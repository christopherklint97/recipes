import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "auto",
			includeAssets: [
				"favicon.ico",
				"favicon.svg",
				"robots.txt",
				"apple-touch-icon.png",
				"logo192.png",
				"logo512.png",
				"logo512-maskable.png",
			],
			manifest: {
				name: "Recipes",
				short_name: "Recipes",
				description: "Personal recipe collection and shopping list.",
				start_url: "/",
				scope: "/",
				display: "standalone",
				orientation: "portrait",
				theme_color: "#0a0a0a",
				background_color: "#0a0a0a",
				icons: [
					{
						src: "/favicon.svg",
						sizes: "any",
						type: "image/svg+xml",
						purpose: "any",
					},
					{ src: "/logo192.png", sizes: "192x192", type: "image/png" },
					{ src: "/logo512.png", sizes: "512x512", type: "image/png" },
					{
						src: "/logo512-maskable.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: ({ request, url }) =>
							request.mode === "navigate" &&
							!url.pathname.startsWith("/api/") &&
							!url.pathname.startsWith("/_"),
						handler: "NetworkFirst",
						options: {
							cacheName: "pages",
							networkTimeoutSeconds: 5,
							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
						},
					},
					{
						urlPattern: ({ request }) => request.destination === "image",
						handler: "CacheFirst",
						options: {
							cacheName: "images",
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30,
							},
						},
					},
					{
						urlPattern: ({ url, request }) =>
							request.method === "GET" && url.pathname.startsWith("/api/"),
						handler: "NetworkFirst",
						options: {
							cacheName: "api-get",
							networkTimeoutSeconds: 5,
							expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
						},
					},
				],
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
});

export default config;
