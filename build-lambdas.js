const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Define the base directory for lambda functions
const baseDir = path.join(__dirname, "lambdas");

// Function to run `npm run build` in a given directory
function runBuildInDir(dir) {
  exec("npm run build", { cwd: dir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running build in ${dir}:`, error);
      return;
    }
    console.log(stdout);

    if (stderr) {
      console.error(stderr);
    }
  });
}

// Function to traverse directories and run build at exactly 1 level deep
function traverseAndBuild(dir, currentDepth = 0) {
  if (currentDepth > 1) return;

  fs.readdir(dir, (err, items) => {
    if (err) {
      console.error(`Error reading directory ${dir}:`, err);
      return;
    }

    items.forEach((item) => {
      const itemPath = path.join(dir, item);

      fs.stat(itemPath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for ${itemPath}:`, err);
          return;
        }

        if (stats.isDirectory()) {
          if (currentDepth === 1) {
            runBuildInDir(itemPath);
          } else {
            traverseAndBuild(itemPath, currentDepth + 1);
          }
        }
      });
    });
  });
}

// Start the process from the base directory
traverseAndBuild(baseDir);
