/* eslint-disable no-console */
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOpenPort() {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch (_) {
      // ignore
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function main() {
  const puppeteer = require("puppeteer");

  const port = process.env.PORT ? Number(process.env.PORT) : await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const deckUrl = `${baseUrl}/?print-pdf`;
  const outPath = path.resolve(process.cwd(), "dist", "GO-FETCH-FIDO-angel-deck.pdf");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Start a static server (same as npm start) for local assets.
  const httpServerBin = require.resolve("http-server/bin/http-server");
  const server = spawn(process.execPath, [httpServerBin, "-p", String(port), "-c-1", "."], { stdio: "inherit" });

  try {
    await waitForServer(baseUrl, 15_000);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.goto(deckUrl, { waitUntil: "networkidle0", timeout: 60_000 });

      // Reveal print mode needs a tick to lay out pages.
      await page.emulateMediaType("print");
      await wait(500);

      await page.pdf({
        path: outPath,
        printBackground: true,
        preferCSSPageSize: true,
      });

      console.log(`\nWrote PDF to: ${outPath}\n`);
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

