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

function main() {
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
    // Create a simple redirect page if site/index.html doesn't exist
    const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=./deck/">
  <title>GO FETCH FIDO — Redirecting</title>
</head>
<body>
  <p>Redirecting to <a href="./deck/">presentation</a>...</p>
</body>
</html>`;
    fs.writeFileSync(path.join(docs, "index.html"), redirectHtml, "utf8");
  }

  // Deck (published at /deck/)
  const deckHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  mkdirp(path.join(docs, "deck"));
  fs.writeFileSync(path.join(docs, "deck", "index.html"), rewriteIndexForDocs(deckHtml), "utf8");

  copyDir(path.join(root, "styles"), path.join(docs, "styles"));
  copyDir(path.join(root, "assets"), path.join(docs, "assets"));

  // Vendor minimal Reveal runtime for Pages
  const revealRoot = path.join(root, "node_modules", "reveal.js");
  copyDir(path.join(revealRoot, "dist"), path.join(docs, "reveal", "dist"));

  // Plugins we use
  const plugins = ["notes", "search", "zoom", "highlight"];
  for (const p of plugins) {
    copyDir(path.join(revealRoot, "plugin", p), path.join(docs, "reveal", "plugin", p));
  }

  console.log("Built docs/ for GitHub Pages.");
}

main();

