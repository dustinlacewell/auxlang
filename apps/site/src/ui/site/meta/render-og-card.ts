import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const svg = readFileSync(resolve(__dirname, "og-card.svg"), "utf-8");

const resvg = new Resvg(svg, {
	font: { loadSystemFonts: true },
	fitTo: { mode: "width", value: 1200 },
});

const png = resvg.render().asPng();

writeFileSync(resolve(__dirname, "../../../../public/og.png"), png);
