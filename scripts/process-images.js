/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

async function keyOutNearBlackToTransparent({ inputPath, outputPath, threshold = 18 }) {
  const sharp = require("sharp");

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // If pixel is very close to black, treat as background and make transparent.
    if (r < threshold && g < threshold && b < threshold) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function main() {
  const assetsDir = path.resolve(process.cwd(), "assets");
  const input = path.join(assetsDir, "solution.jpg");
  const output = path.join(assetsDir, "solution-keyed.png");

  if (!fs.existsSync(input)) {
    console.log(`Skipping: missing ${input}`);
    return;
  }

  await keyOutNearBlackToTransparent({ inputPath: input, outputPath: output, threshold: 18 });
  console.log(`Wrote ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

