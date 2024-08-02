const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

// Define source and destination directories
const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist", "nodejs");

// Create the output directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Get all TypeScript files in the src directory
const files = fs.readdirSync(srcDir).filter((file) => file.endsWith(".ts"));

// Compile each TypeScript file
files.forEach((file) => {
  const entryPoint = path.join(srcDir, file);
  const outfile = path.join(distDir, file.replace(".ts", ".js"));

  esbuild
    .build({
      entryPoints: [entryPoint],
      outfile: outfile,
      bundle: true, // Set to true if you need to bundle multiple files into one
      platform: "node",
      target: "node20", // Adjust based on your Node.js version
    })
    .catch(() => process.exit(1));
});
