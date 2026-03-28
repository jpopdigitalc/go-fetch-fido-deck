/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copy(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  mkdirp(destDir);
  fs.cpSync(srcDir, destDir, { recursive: true });
}

function rewriteIndexForDocs(html) {
  // Swap node_modules paths to vendored reveal paths under docs/reveal/
  return html
    .replaceAll("node_modules/reveal.js/dist/", "reveal/dist/")
    .replaceAll("node_modules/reveal.js/plugin/", "reveal/plugin/");
}

function vendorRevealInto(docsDir) {
  const root = process.cwd();
  const revealRoot = path.join(root, "node_modules", "reveal.js");
  copyDir(path.join(revealRoot, "dist"), path.join(docsDir, "reveal", "dist"));
  const plugins = ["notes", "search", "zoom", "highlight"];
  for (const p of plugins) {
    copyDir(path.join(revealRoot, "plugin", p), path.join(docsDir, "reveal", "plugin", p));
  }
}

/** GitHub Pages: Reveal decks under docs/ (hub at /, vendored reveal.js). */
function buildInferencePagesOnly() {
  const root = process.cwd();
  const docs = path.join(root, "docs");
  const inferencePath = path.join(root, "inference-course.html");

  rmrf(docs);
  mkdirp(docs);
  fs.writeFileSync(path.join(docs, ".nojekyll"), "", "utf8");

  if (!fs.existsSync(inferencePath)) {
    console.error("inference-course.html not found.");
    process.exit(1);
  }
  const inferenceHtml = fs.readFileSync(inferencePath, "utf8");
  fs.writeFileSync(
    path.join(docs, "inference-course.html"),
    rewriteIndexForDocs(inferenceHtml),
    "utf8"
  );

  const quarkPath = path.join(root, "quark-diffusion.html");
  if (fs.existsSync(quarkPath)) {
    const quarkHtml = fs.readFileSync(quarkPath, "utf8");
    fs.writeFileSync(path.join(docs, "quark-diffusion.html"), rewriteIndexForDocs(quarkHtml), "utf8");
  }

  const briefingPdf = "Briefing Doc_ Quantizing Diffusion Models with AMD Quark.pdf";
  const briefingSrc = path.join(root, briefingPdf);
  if (fs.existsSync(briefingSrc)) {
    copy(briefingSrc, path.join(docs, briefingPdf));
  }

  const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presentations</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1a1a1a; }
    ul { padding-left: 1.25rem; }
    a { color: #1d6b3a; }
    a:hover { color: #14532d; }
  </style>
</head>
<body>
  <h1>Presentations</h1>
  <ul>
    <li><a href="./quark-diffusion.html">AMD Quark — Diffusion quantization</a></li>
    <li><a href="./inference-course.html">Inference Masterclass (KV cache + speculative decoding)</a></li>
  </ul>
</body>
</html>`;
  fs.writeFileSync(path.join(docs, "index.html"), hubHtml, "utf8");

  copyDir(path.join(root, "styles"), path.join(docs, "styles"));
  vendorRevealInto(docs);

  console.log("Built docs/ for GitHub Pages (hub at /index.html).");
}

function main() {
  if (process.argv.includes("--inference-only")) {
    buildInferencePagesOnly();
    return;
  }

  const root = process.cwd();
  const docs = path.join(root, "docs");

  rmrf(docs);
  mkdirp(docs);

  // Disable Jekyll on GitHub Pages so Reveal assets aren't munged
  fs.writeFileSync(path.join(docs, ".nojekyll"), "", "utf8");

  // Website (published at /) - optional, create redirect if missing
  const siteIndexPath = path.join(root, "site", "index.html");
  if (fs.existsSync(siteIndexPath)) {
    const siteHtml = fs.readFileSync(siteIndexPath, "utf8");
    const rewrittenSite = rewriteIndexForDocs(siteHtml)
      // site/index.html uses ../node_modules/... so rewriteIndexForDocs leaves ../reveal/...
      .replaceAll("../reveal/", "reveal/")
      .replaceAll("../node_modules/reveal.js/dist/", "reveal/dist/")
      .replaceAll("../node_modules/reveal.js/plugin/", "reveal/plugin/")
      .replaceAll("../styles/", "styles/")
      .replaceAll("../assets/", "assets/")
      .replaceAll('href="./deck/"', 'href="deck/"')
      .replaceAll('src="../', 'src="');
    fs.writeFileSync(path.join(docs, "index.html"), rewrittenSite, "utf8");
  } else {
    const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presentations</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    ul { padding-left: 1.25rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Presentations</h1>
  <ul>
    <li><a href="./deck/">GO FETCH FIDO — Angel Deck</a></li>
    <li><a href="./inference-course.html">Inference Masterclass (KV cache + speculative decoding)</a></li>
    <li><a href="./quark-diffusion.html">AMD Quark — Diffusion quantization</a></li>
  </ul>
</body>
</html>`;
    fs.writeFileSync(path.join(docs, "index.html"), hubHtml, "utf8");
  }

  // Deck (published at /deck/)
  const deckHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  mkdirp(path.join(docs, "deck"));
  // Rewrite paths for deck subdirectory - need ../ to go up to docs root
  const rewrittenDeck = rewriteIndexForDocs(deckHtml)
    .replaceAll('href="styles/', 'href="../styles/')
    .replaceAll('href="assets/', 'href="../assets/')
    .replaceAll('src="assets/', 'src="../assets/')
    .replaceAll('href="reveal/', 'href="../reveal/')
    .replaceAll('src="reveal/', 'src="../reveal/')
    .replaceAll('href=\'styles/', 'href="../styles/')
    .replaceAll('href=\'assets/', 'href="../assets/')
    .replaceAll('src=\'assets/', 'src="../assets/')
    .replaceAll('href=\'reveal/', 'href="../reveal/')
    .replaceAll('src=\'reveal/', 'src="../reveal/');
  fs.writeFileSync(path.join(docs, "deck", "index.html"), rewrittenDeck, "utf8");

  const inferencePath = path.join(root, "inference-course.html");
  if (fs.existsSync(inferencePath)) {
    const inferenceHtml = fs.readFileSync(inferencePath, "utf8");
    fs.writeFileSync(
      path.join(docs, "inference-course.html"),
      rewriteIndexForDocs(inferenceHtml),
      "utf8"
    );
  }

  const quarkPath = path.join(root, "quark-diffusion.html");
  if (fs.existsSync(quarkPath)) {
    const quarkHtml = fs.readFileSync(quarkPath, "utf8");
    fs.writeFileSync(path.join(docs, "quark-diffusion.html"), rewriteIndexForDocs(quarkHtml), "utf8");
  }

  copyDir(path.join(root, "styles"), path.join(docs, "styles"));
  copyDir(path.join(root, "assets"), path.join(docs, "assets"));

  vendorRevealInto(docs);

  console.log("Built docs/ for GitHub Pages.");
}

main();

