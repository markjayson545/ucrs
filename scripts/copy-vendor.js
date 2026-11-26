// Copy the library's browser builds into the existing public assets directory.
// Run after npm install; no bundler or CDN is required by the EJS pages.
const fs = require("node:fs");
const path = require("node:path");
const source = path.dirname(require.resolve("gsap/package.json"));
const destination = path.join(__dirname, "../public/vendor/gsap");
fs.mkdirSync(destination, { recursive: true });
const files = ["gsap.min.js", "ScrollTrigger.min.js"];
for (const file of files) {
  fs.copyFileSync(
    path.join(source, "dist", file),
    path.join(destination, file),
  );
}
// The npm package ships its license notice in the build headers, not a LICENSE file.
const notices = files
  .map(
    (file) =>
      fs
        .readFileSync(path.join(source, "dist", file), "utf8")
        .match(/^\/\*![\s\S]*?\*\//)?.[0] || file,
  )
  .join("\n\n");
fs.writeFileSync(
  path.join(destination, "NOTICE.txt"),
  notices + "\n\nFull license terms: https://gsap.com/standard-license\n",
);
const { version } = require("gsap/package.json");
fs.writeFileSync(
  path.join(destination, "README.txt"),
  `GSAP ${version} — unmodified npm browser builds.\nRegenerate: npm run assets:vendor\nSource: https://gsap.com/\nLicense notices: see NOTICE.txt and the preserved build headers.\n`,
);
console.log(`Copied GSAP ${version} + ScrollTrigger into public/vendor/gsap.`);

const chartDist = path.dirname(require.resolve("chart.js"));
const chartDestination = path.join(__dirname, "../public/vendor/chartjs");
fs.mkdirSync(chartDestination, { recursive: true });
fs.copyFileSync(path.join(chartDist, "chart.umd.min.js"), path.join(chartDestination, "chart.umd.min.js"));
fs.copyFileSync(path.join(chartDist, "../LICENSE.md"), path.join(chartDestination, "LICENSE.md"));
console.log("Copied Chart.js into public/vendor/chartjs.");
