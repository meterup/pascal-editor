#!/usr/bin/env bun
import { $ } from "bun";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Publishes every public workspace package to npm, then tags the release.
//
// Why not `changeset publish`? Under Bun it does not resolve the `workspace:`
// protocol and would publish broken ranges like "workspace:^". `bun publish`
// rewrites `workspace:` ranges to concrete versions in the tarball. `changeset
// tag` then creates the git tags and prints the "New tag: <pkg>@<version>"
// lines that changesets/action parses to cut GitHub Releases.
//
// Packages already published at their current version are skipped, so re-runs
// are safe; any other publish failure aborts (Bun's $ throws on non-zero exit).

for (const dir of readdirSync("packages")) {
  const manifestPath = join("packages", dir, "package.json");
  let manifest: { name?: string; version?: string; private?: boolean };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    continue; // not a package directory
  }
  if (manifest.private === true || !manifest.name) continue;

  const ref = `${manifest.name}@${manifest.version}`;
  const exists = await $`npm view ${ref} version`.quiet().nothrow();
  if (exists.exitCode === 0) {
    console.log(`→ ${ref} already published, skipping`);
    continue;
  }

  console.log(`→ Publishing ${ref}`);
  await $`bun publish --access public`.cwd(join("packages", dir));
}

await $`bunx changeset tag`;
