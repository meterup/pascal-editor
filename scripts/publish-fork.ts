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
// versions) -> rewrite our own `@pascal-app/*` names to `${TARGET_PREFIX}*`
// across every file in the tarball -> `npm publish`. The rewrite must touch the
// emitted code too, not just package.json: a consumer installs
// `${SCOPE}/pascal-core`, so the `import` specifiers in dist/** (and editor's
// shipped src) have to match.
//
// To target a different scope (e.g. @meterup) set PUBLISH_SCOPE, and
// PUBLISH_REPOSITORY to the "owner/repo" that should own the packages. Auth
// comes from .npmrc (NODE_AUTH_TOKEN).
//
// A workstation run and a CI run produce the same artifacts. Nothing here keys
// off GITHUB_ACTIONS, because a release published by hand is still a release:
// it needs the same git tags, the same GitHub Releases, and the same
// repository link on each package.
//
// With --snapshot (run after `bun changeset` + `bun run build`): mints
// 0.0.0-snapshot-<timestamp> versions via `changeset version --snapshot`,
// publishes them to the `snapshot` dist-tag (leaving `latest` untouched), and
// skips git tags / GitHub Releases. It dirties the working tree, and a clean
// tree is required up front so the cleanup is unambiguous:
//
//   git checkout . && git clean -f -- '*/CHANGELOG.md'
//
// `git checkout .` alone is not enough. `changeset version` creates a
// CHANGELOG.md for any package that doesn't have one yet, and an untracked
// file survives a checkout.

/** Whether changesets is holding a prerelease line (`changeset pre enter`). */
const inPreMode = (): boolean => {
  try {
    return JSON.parse(readFileSync(join(".changeset", "pre.json"), "utf8")).mode === "pre";
  } catch {
    return false;
  }
};

const SOURCE_PREFIX = "@pascal-app/";
const SCOPE = process.env.PUBLISH_SCOPE ?? "@meterup";
const NAME_PREFIX = "pascal-"; // always prefix published names under the fork scope
const TARGET_PREFIX = `${SCOPE}/${NAME_PREFIX}`; // e.g. "@meterup/pascal-"
const REGISTRY = "https://npm.pkg.github.com";
const DRY_RUN = process.argv.includes("--dry-run");
// --snapshot: mint ephemeral 0.0.0-snapshot-<timestamp> versions and publish them
// to the `snapshot` dist-tag instead of `latest` (see changesets snapshot releases).
const SNAPSHOT = process.argv.includes("--snapshot");
const SNAPSHOT_TAG = "snapshot"; // both the changesets snapshot id and the dist-tag
// A prerelease must not take `latest`, or `npm install` resolves to it by
// default. The fork's stable line is 0.9.x and the beta line is 1.0.0-beta.N,
// so while pre mode holds, published betas go to the `beta` dist-tag instead.
const DIST_TAG = SNAPSHOT ? SNAPSHOT_TAG : inPreMode() ? "beta" : "latest";
// Mark GitHub Releases as prereleases for the same reason, so a beta doesn't
// take "Latest" on the releases page from the stable line.
const RELEASE_FLAGS = inPreMode() ? ["--prerelease"] : [];
// Used when a package has no CHANGELOG entry for the version, which happens for
// a package bumped only because a dependency moved.
const FALLBACK_NOTES = "Published to GitHub Packages.";
// "owner/repo" that should own the published packages. GitHub links a package
// to a repo by the `repository.url` in its manifest, and only on first publish.
// Falling back to nothing when GITHUB_REPOSITORY is unset (i.e. anywhere but
// Actions) meant a package first published from a workstation was created
// standalone and private, which then denied the repo's own GITHUB_TOKEN write
// access to it forever after.
const REPOSITORY =
  process.env.PUBLISH_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? "meterup/pascal-editor";

// Files whose contents may reference the scope. Note extname("x.d.ts") === ".ts".
const TEXT_EXT = new Set([
  ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts", ".tsx", ".jsx", ".json", ".md", ".map",
]);

// Any `@pascal-app/<name>`, stopping before a subpath so `/catalog` survives.
// No `.` in the class: npm allows it in a name but none of ours use it, and a
// prose reference ending a sentence ("...in @pascal-app/nodes.") is far more
// common — capturing the period would leave the name unrecognized and unrenamed.
const SCOPED_NAME = /@pascal-app\/[a-zA-Z0-9_-]+/g;

/** Read a package.json `name`, or null if the directory isn't a package. */
const packageNameIn = (dir: string): string | null => {
  try {
    const { name } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
};

// The rewrite has to key off the workspace's own package names, not the bare
// scope prefix: `@pascal-app` also hosts packages upstream merely *consumes*
// from npm and we don't fork — `@pascal-app/lingo`, `@pascal-app/plugin-*`.
// Renaming those would point consumers at `${SCOPE}/pascal-lingo` and friends,
// which nobody publishes, and the install would fail to resolve.
const ownedNames = new Set(
  readdirSync("packages")
    .map((dir) => packageNameIn(join("packages", dir)))
    .filter((name): name is string => name !== null && name.startsWith(SOURCE_PREFIX)),
);

/** Rewrite our own `@pascal-app/*` names to `${TARGET_PREFIX}*` in a blob of text. */
const rescopeText = (text: string): string =>
  text.replace(SCOPED_NAME, (name) =>
    ownedNames.has(name) ? name.replace(SOURCE_PREFIX, TARGET_PREFIX) : name,
  );

/** Rewrite our own `@pascal-app/*` names to `${TARGET_PREFIX}*` across a packed package. */
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
    const after = rescopeText(before);
    if (after !== before) writeFileSync(path, after);
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

/**
 * The CHANGELOG entry for one version, ready to use as GitHub Release notes,
 * or null when the package has no entry for it.
 *
 * Changesets writes the changelog against the source names, so the text is
 * rescoped to match what was actually published.
 */
const releaseNotesFor = (packageDir: string, version: string): string | null => {
  let changelog: string;
  try {
    changelog = readFileSync(join(packageDir, "CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }
  // Sections run from `## <version>` to the next `## ` at the start of a line.
  // Anchored on the newline so `## 1.0.0-beta.5` can't match inside
  // `## 1.0.0-beta.50`, and so a heading mentioned mid-prose is ignored.
  const heading = `\n## ${version}\n`;
  const start = changelog.indexOf(heading);
  if (start === -1) return null;
  const bodyStart = start + heading.length;
  const end = changelog.indexOf("\n## ", bodyStart);
  const body = changelog.slice(bodyStart, end === -1 ? undefined : end).trim();
  return body ? rescopeText(body) : null;
};

// Snapshot mode mints throwaway versions from the pending changesets. Only
// packages with a changeset (+ their dependents) get a snapshot version; the
// rest keep their released version and are skipped below as already-published.
// `bun install` re-resolves the lockfile so `bun pm pack` emits snapshot ranges.
//
// Changesets refuses --snapshot while in pre mode, and the fork sits in pre mode
// permanently to hold the 1.x-beta line. Exiting is safe here and only here: the
// tree is already throwaway (see the header), so the flipped pre.json dies with
// it instead of ending the prerelease for real.
//
// Both of those edits are meant to be discarded, which only works if nothing
// else in the tree is pending: otherwise `git checkout .` cannot tell the
// script's scribbles from real work, and committing instead buries snapshot
// versions and a `"mode": "exit"` pre.json in history.
if (SNAPSHOT && !DRY_RUN) {
  if ((await $`git diff --quiet HEAD`.nothrow()).exitCode !== 0) {
    throw new Error("--snapshot needs a clean working tree; commit or stash first");
  }
  if (inPreMode()) await $`bunx changeset pre exit`;
  await $`bunx changeset version --snapshot ${SNAPSHOT_TAG}`;
  await $`bun install`;
}

const published: { tag: string; dir: string; version: string }[] = [];

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
    relinkRepository(packed, REPOSITORY, `packages/${dir}`);

    if (DRY_RUN) {
      console.log(`→ [dry-run] ${tag}`);
      continue;
    }

    console.log(`→ Publishing ${tag} (dist-tag: ${DIST_TAG})`);
    await $`npm publish ${packed} --ignore-scripts --registry ${REGISTRY} --tag ${DIST_TAG}`;
    published.push({ tag, dir, version: manifest.version ?? "" });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// Tag and release under the fork scope. We do NOT print changesets' "New tag:"
// lines and let changesets/action create the releases: the action matches each
// printed name against a workspace package, which never matches our rescoped
// names (the source stays @pascal-app/*), so it errors. Instead we own the tag
// + release here, named after what was actually published. Best-effort so a
// re-run (tag/release already exists) doesn't fail the job. Skipped for
// snapshots — they're ephemeral and shouldn't leave tags/releases behind.
if (!SNAPSHOT && published.length > 0) {
  const tags = published.map(({ tag }) => tag);
  for (const tag of tags) await $`git tag ${tag}`.nothrow();
  await $`git push origin ${tags}`.nothrow();
  for (const { tag, dir, version } of published) {
    const notes = releaseNotesFor(join("packages", dir), version) ?? FALLBACK_NOTES;
    await $`gh release create ${tag} --title ${tag} --notes ${notes} ${RELEASE_FLAGS}`.nothrow();
  }
}
