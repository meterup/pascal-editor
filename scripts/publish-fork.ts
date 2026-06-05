#!/usr/bin/env bun
import { $ } from "bun";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

// Publishes the workspace's public packages to GitHub Packages under a fork
// scope, WITHOUT changing the @pascal-app/* source. The source tree stays
// byte-identical to upstream so merges/rebases stay clean; the rename happens
// only inside the published tarball.
//
// Names are rescoped AND re-prefixed: `@pascal-app/<x>` -> `${SCOPE}/pascal-<x>`
// (e.g. @pascal-app/viewer -> @jrolfs/pascal-viewer). The `pascal-` prefix keeps
// the published names meaningful outside the upstream scope, where bare names
// like `core`/`viewer` would be too generic.
//
// Per package: `bun pm pack` (which resolves `workspace:` ranges to concrete
// versions) -> rewrite `@pascal-app/` to `${TARGET_PREFIX}` across every file in
// the tarball -> `npm publish`. The rewrite must touch the emitted code too, not
// just package.json: a consumer installs `${SCOPE}/pascal-core`, so the `import`
// specifiers in dist/** (and editor's shipped src) have to match.
//
// To target a different scope (e.g. @meterup) set PUBLISH_SCOPE — that is the
// only thing that changes. Auth comes from .npmrc (NODE_AUTH_TOKEN).

const SOURCE_PREFIX = "@pascal-app/";
const SCOPE = process.env.PUBLISH_SCOPE ?? "@jrolfs";
const NAME_PREFIX = "pascal-"; // always prefix published names under the fork scope
const TARGET_PREFIX = `${SCOPE}/${NAME_PREFIX}`; // e.g. "@jrolfs/pascal-"
const REGISTRY = "https://npm.pkg.github.com";
const DRY_RUN = process.argv.includes("--dry-run");
const IN_CI = process.env.GITHUB_ACTIONS === "true";

// Files whose contents may reference the scope. Note extname("x.d.ts") === ".ts".
const TEXT_EXT = new Set([
  ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".tsx", ".jsx", ".json", ".md", ".map",
]);

/** Rewrite every `@pascal-app/` token to `${TARGET_PREFIX}` across a packed package. */
const rewriteScope = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteScope(path);
      continue;
    }
    if (!TEXT_EXT.has(extname(entry.name))) continue;
    const before = readFileSync(path, "utf8");
    if (!before.includes(SOURCE_PREFIX)) continue;
    writeFileSync(path, before.replaceAll(SOURCE_PREFIX, TARGET_PREFIX));
  }
};

const newTags: string[] = [];

for (const dir of readdirSync("packages")) {
  let manifest: { name?: string; version?: string; private?: boolean };
  try {
    manifest = JSON.parse(readFileSync(join("packages", dir, "package.json"), "utf8"));
  } catch {
    continue; // not a package directory
  }
  if (manifest.private === true || !manifest.name?.startsWith(SOURCE_PREFIX)) continue;

  const tag = `${manifest.name.replace(SOURCE_PREFIX, TARGET_PREFIX)}@${manifest.version}`;

  const exists = await $`npm view ${tag} version --registry ${REGISTRY}`.quiet().nothrow();
  if (exists.exitCode === 0) {
    console.log(`→ ${tag} already published, skipping`);
    continue;
  }

  // Pack first — bun resolves `workspace:` ranges to concrete versions here.
  const work = mkdtempSync(join(tmpdir(), "publish-fork-"));
  try {
    await $`bun pm pack --destination ${work}`.cwd(join("packages", dir)).quiet();
    const tarball = readdirSync(work).find((file) => file.endsWith(".tgz"));
    if (!tarball) throw new Error(`pack produced no tarball for ${manifest.name}`);
    await $`tar -xzf ${join(work, tarball)} -C ${work}`.quiet();

    const packed = join(work, "package");
    rewriteScope(packed);

    if (DRY_RUN) {
      console.log(`→ [dry-run] ${tag}`);
      continue;
    }

    console.log(`→ Publishing ${tag}`);
    await $`npm publish ${packed} --ignore-scripts --registry ${REGISTRY}`;
    newTags.push(tag);
    console.log(`New tag: ${tag}`); // changesets/action parses this for the GitHub Release
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Tag the published versions under the fork scope so GitHub Releases attach to
// real refs named after what was actually published (not the @pascal-app source).
if (IN_CI && newTags.length > 0) {
  for (const tag of newTags) await $`git tag ${tag}`.nothrow();
  await $`git push origin ${newTags}`.nothrow();
}
