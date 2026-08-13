import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const globalsPath = resolve(projectRoot, "app", "globals.css");
const globalsSource = await readFile(globalsPath, "utf8");
// Supports every CSS import form used by browsers:
// @import "file.css"; @import url("file.css"); @import url(file.css);
// The scan covers the complete file and is intentionally not backed by a fixed import list.
const importPattern = /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^'"\s);]+))/g;
const localImports = [...globalsSource.matchAll(importPattern)]
  .map((match) => match[1] ?? match[2] ?? match[3])
  .filter((importPath) => importPath.startsWith("."));

if (localImports.length === 0) {
  console.error(`[check:styles] No local CSS imports were found in ${globalsPath}.`);
  process.exitCode = 1;
} else {
  const duplicateImports = [...new Set(localImports.filter((item, index) => localImports.indexOf(item) !== index))];
  if (duplicateImports.length > 0) {
    console.error(`[check:styles] Duplicate CSS imports in app/globals.css:\n${duplicateImports.map((item) => `- ${item}`).join("\n")}`);
    process.exitCode = 1;
  }

  const missingImports = [];
  for (const importPath of localImports) {
    const absolutePath = resolve(dirname(globalsPath), importPath);
    try {
      const file = await stat(absolutePath);
      if (!file.isFile()) {
        missingImports.push(`${importPath} -> ${absolutePath} (not a file)`);
        continue;
      }

      // stat is case-insensitive on Windows, so verify the actual directory entry too.
      const actualNames = await readdir(dirname(absolutePath));
      if (!actualNames.includes(basename(absolutePath))) {
        missingImports.push(`${importPath} -> ${absolutePath} (filename casing mismatch)`);
      }
    } catch {
      missingImports.push(`${importPath} -> ${absolutePath}`);
    }
  }

  if (missingImports.length > 0) {
    console.error(`[check:styles] Missing CSS imports referenced by app/globals.css:\n${missingImports.map((item) => `- ${item}`).join("\n")}`);
    process.exitCode = 1;
  }

  if (!process.exitCode) {
    console.log(`[check:styles] Verified ${localImports.length} local CSS imports from app/globals.css.`);
  }
}
