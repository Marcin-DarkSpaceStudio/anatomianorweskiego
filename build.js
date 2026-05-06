#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const mode = process.argv[2] || "all";

mkdirSync(join(__dirname, "docs"), { recursive: true });

// ── CSS ──────────────────────────────────────────────────────────────────────

async function buildCSS() {
  const { compile } = await import("sass");
  const postcss = (await import("postcss")).default;
  const autoprefixer = (await import("autoprefixer")).default;

  const result = compile(join(__dirname, "scss/anatomia.scss"), {
    style: "compressed",
    loadPaths: [join(__dirname, "scss")],
    quietDeps: true,
    silenceDeprecations: ["import", "slash-div", "global-builtin"],
  });

  const processed = await postcss([autoprefixer]).process(result.css, {
    from: "scss/anatomia.scss",
    to: "docs/anatomia.css",
  });

  writeFileSync(join(__dirname, "docs/anatomia.css"), processed.css);
  console.log("CSS: scss/anatomia.scss → docs/anatomia.css");
}

// ── JS ───────────────────────────────────────────────────────────────────────

async function buildJS() {
  const { minify } = await import("terser");

  const src = readFileSync(join(__dirname, "js/j-anatomia.js"), "utf8");
  const result = await minify(src, {
    compress: true,
    mangle: true,
  });

  writeFileSync(join(__dirname, "docs/j-anatomia-min.js"), result.code);
  console.log("JS:  js/j-anatomia.js → docs/j-anatomia-min.js");
}

// ── HTML ─────────────────────────────────────────────────────────────────────

async function buildHTML() {
  const { minify } = await import("html-minifier-terser");

  const htmlFiles = [
    { src: "html/index.html", dest: "docs/index.html" },
    { src: "html/404.html", dest: "docs/404.html" },
    { src: "html/google1d1a1ebbc4f7e1ae.html", dest: "docs/google1d1a1ebbc4f7e1ae.html" },
    { src: "html/linki/index.html", dest: "docs/linki/index.html" },
  ];

  const opts = {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
  };

  for (const { src, dest } of htmlFiles) {
    const input = readFileSync(join(__dirname, src), "utf8");
    const output = await minify(input, opts);
    mkdirSync(dirname(join(__dirname, dest)), { recursive: true });
    writeFileSync(join(__dirname, dest), output);
    console.log(`HTML: ${src} → ${dest}`);
  }
}

// ── WATCH ────────────────────────────────────────────────────────────────────

async function watch() {
  const chokidar = await import("chokidar");

  await buildAll();
  console.log("\nWatching for changes…");

  chokidar
    .watch(["scss/**/*.scss"], { ignoreInitial: true })
    .on("all", async () => {
      console.log("\nSCSS changed");
      await buildCSS().catch(console.error);
    });

  chokidar
    .watch(["js/**/*.js"], { ignoreInitial: true })
    .on("all", async () => {
      console.log("\nJS changed");
      await buildJS().catch(console.error);
    });

  chokidar
    .watch(["html/**/*.html"], { ignoreInitial: true })
    .on("all", async () => {
      console.log("\nHTML changed");
      await buildHTML().catch(console.error);
    });
}

async function buildAll() {
  await Promise.all([buildCSS(), buildJS()]);
  await buildHTML();
}

// ── DISPATCH ─────────────────────────────────────────────────────────────────

try {
  if (mode === "css") await buildCSS();
  else if (mode === "js") await buildJS();
  else if (mode === "html") await buildHTML();
  else if (mode === "watch") await watch();
  else await buildAll();
} catch (err) {
  console.error(err);
  process.exit(1);
}
