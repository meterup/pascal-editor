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
// (e.g. @pascal-app/viewer -> @meterup/pascal-viewer). The `pascal-` prefix keeps
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
const SCOPE = process.env.PUBLISH_SCOPE ?? "@meterup";
const NAME_PREFIX = "pascal-"; // always prefix published names under the fork scope
const TARGET_PREFIX = `${SCOPE}/${NAME_PREFIX}`; // e.g. "@meterup/pascal-"
const REGISTRY = "https://npm.pkg.github.com";
const DRY_RUN = process.argv.includes("--dry-run");
const IN_CI = process.env.GITHUB_ACTIONS === "true";
// "owner/repo" of the publishing fork in CI; used to link packages to this repo.
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

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

/**
 * Point the packed package's repository.url at the publishing fork so GitHub
 * Packages links the package to this repo. The source field still points at
 * upstream (pascalorg/editor); only the published artifact is changed. Creates
 * the field when a package omits it (e.g. editor), so every package links.
 */
const relinkRepository = (packageDir: string, repo: string, directory: string): void => {
  const manifestPath = join(packageDir, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const url = `https://github.com/${repo}.git`;
  manifest.repository =
    typeof manifest.repository === "string"
      ? url
      : { type: "git", ...manifest.repository, url, directory };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
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
    if (GITHUB_REPOSITORY) relinkRepository(packed, GITHUB_REPOSITORY, `packages/${dir}`);

    if (DRY_RUN) {
      console.log(`→ [dry-run] ${tag}`);
      continue;
    }

    console.log(`→ Publishing ${tag}`);
    await $`npm publish ${packed} --ignore-scripts --registry ${REGISTRY}`;
    newTags.push(tag);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Tag and release under the fork scope. We do NOT print changesets' "New tag:"
// lines and let changesets/action create the releases: the action matches each
// printed name against a workspace package, which never matches our rescoped
// names (the source stays @pascal-app/*), so it errors. Instead we own the tag
// + release here, named after what was actually published. Best-effort so a
// re-run (tag/release already exists) doesn't fail the job.
if (IN_CI && newTags.length > 0) {
  for (const tag of newTags) await $`git tag ${tag}`.nothrow();
  await $`git push origin ${newTags}`.nothrow();
  for (const tag of newTags) {
    await $`gh release create ${tag} --title ${tag} --notes ${"Published to GitHub Packages."}`.nothrow();
  }
}
