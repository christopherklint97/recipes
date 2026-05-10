import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ALLOWED_MIME = new Map<string, string>([
	["image/jpeg", "jpg"],
	["image/jpg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function getUploadDir(): string {
	const dir = resolve(process.env.UPLOAD_DIR ?? "data/images");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function extForMime(mime: string): string | undefined {
	return ALLOWED_MIME.get(mime.toLowerCase());
}

export function sanitizeFilename(name: string): string | null {
	if (!/^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(name)) return null;
	return name;
}

export function mimeForExt(ext: string): string {
	switch (ext) {
		case "jpg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		default:
			return "application/octet-stream";
	}
}
