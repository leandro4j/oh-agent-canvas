import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_INSTRUCTIONS = resolve(REPOSITORY_ROOT, "AGENTS.md");
const INSTRUCTIONS_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  ".agents/instructions",
);
const SKILLS_DIRECTORY = resolve(REPOSITORY_ROOT, ".agents/skills");
const MAX_ROOT_BYTES = 4096;

const instructionFiles = readdirSync(INSTRUCTIONS_DIRECTORY)
  .filter((name) => name.endsWith(".md"))
  .map((name) => resolve(INSTRUCTIONS_DIRECTORY, name));
const skillFiles = readdirSync(SKILLS_DIRECTORY)
  .filter((name) => name.endsWith(".md"))
  .map((name) => resolve(SKILLS_DIRECTORY, name));
const filesToCheck = [ROOT_INSTRUCTIONS, ...instructionFiles, ...skillFiles];
const errors = [];
const rootLinkedFiles = new Set();

const rootBytes = statSync(ROOT_INSTRUCTIONS).size;
if (rootBytes > MAX_ROOT_BYTES) {
  errors.push(
    `AGENTS.md is ${rootBytes} bytes; maximum is ${MAX_ROOT_BYTES} bytes`,
  );
}

for (const file of filesToCheck) {
  const contents = readFileSync(file, "utf8");
  const links = contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split("#", 1)[0];

    if (
      target.length === 0 ||
      isAbsolute(target) ||
      /^[a-z][a-z\d+.-]*:/i.test(target)
    ) {
      continue;
    }

    const resolvedTarget = resolve(dirname(file), decodeURIComponent(target));
    if (file === ROOT_INSTRUCTIONS) {
      rootLinkedFiles.add(resolvedTarget);
    }
    if (!existsSync(resolvedTarget)) {
      errors.push(
        `${file.slice(REPOSITORY_ROOT.length + 1)} links to missing ${target}`,
      );
    }
  }
}

for (const instructionFile of instructionFiles) {
  if (!rootLinkedFiles.has(instructionFile)) {
    errors.push(
      `${instructionFile.slice(REPOSITORY_ROOT.length + 1)} has no AGENTS.md pointer`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Agent instructions valid: AGENTS.md ${rootBytes}/${MAX_ROOT_BYTES} bytes; ${filesToCheck.length} files checked`,
  );
}
