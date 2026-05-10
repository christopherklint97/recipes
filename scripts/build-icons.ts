import { readFileSync, writeFileSync } from "node:fs";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const svg = readFileSync("./public/favicon.svg");

async function emit(size: number, name: string, padding = 0) {
	if (padding === 0) {
		const buf = await sharp(svg, { density: 384 })
			.resize(size, size)
			.png()
			.toBuffer();
		writeFileSync(`./public/${name}`, buf);
		return;
	}
	const inner = size - padding * 2;
	const inset = await sharp(svg, { density: 384 })
		.resize(inner, inner)
		.png()
		.toBuffer();
	const buf = await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: { r: 10, g: 10, b: 10, alpha: 1 },
		},
	})
		.composite([{ input: inset, top: padding, left: padding }])
		.png()
		.toBuffer();
	writeFileSync(`./public/${name}`, buf);
}

await emit(180, "apple-touch-icon.png");
await emit(192, "logo192.png");
await emit(512, "logo512.png");
await emit(512, "logo512-maskable.png", 64);

const icoSizes = [16, 32, 48, 64];
const icoBufs = await Promise.all(
	icoSizes.map((s) =>
		sharp(svg, { density: 384 }).resize(s, s).png().toBuffer(),
	),
);
const ico = await pngToIco(icoBufs);
writeFileSync("./public/favicon.ico", ico);
console.log("[build-icons] done");
