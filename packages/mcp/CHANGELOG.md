# Changelog

## 0.3.1

### Patch Changes

- f986596: Backport the [**tsgo** adoption change](https://github.com/pascalorg/editor/pull/442) from upstream Pascal primarily for this change to the **@react-three/fiber** JSX interface module augmentation:

  > The blocker for TS 7 here was the react-three-fiber + `three/webgpu` JSX augmentation in `viewer`: mapping the whole `three/webgpu` namespace (`ThreeToJSXElements<typeof THREE>`) made the native checker fail with **TS2320** (heritage conflict on `PMREMGenerator`: core-three's `WebGLRenderer` arg vs webgpu's abstract `Renderer`), **TS2430**, and **TS2590** ("union too complex"). `tsc 6` tolerated it. This narrows the augmentation to the one webgpu node material used as a JSX tag — `<lineBasicNodeMaterial>` — following R3F's "extract the classes you need" guidance. Types-only; runtime `extend(THREE)` is unchanged.

All notable changes to `@pascal-app/mcp` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-18

### Added

- Initial release.
- `SceneBridge` headless adapter for `@pascal-app/core` with RAF polyfill so
  the Zustand store and Zundo temporal middleware run cleanly in Node.
- 19 MCP tools covering scene querying (`get_scene`, `get_node`,
  `describe_node`, `find_nodes`, `measure`), mutation (`apply_patch`,
  `create_level`, `create_wall`, `place_item`, `cut_opening`, `set_zone`,
  `duplicate_level`, `delete_node`), undo/redo (`undo`, `redo`), export
  (`export_json`, `export_glb`), validation (`validate_scene`,
  `check_collisions`), plus 2 vision tools (`analyze_floorplan_image`,
  `analyze_room_photo`) backed by MCP sampling.
- 4 MCP resources: `pascal://scene/current`,
  `pascal://scene/current/summary`, `pascal://catalog/items`, and
  `pascal://constraints/{levelId}`.
- 3 MCP prompts: `from_brief`, `iterate_on_feedback`, and
  `renovation_from_photos`.
- stdio and Streamable HTTP transports.
- `pascal-mcp` CLI binary with `--stdio`, `--http --port`, and `--scene`
  flags.
- Local `SqliteSceneStore` backed by built-in SQLite drivers (`bun:sqlite` in
  the MCP CLI, `node:sqlite` in the Next.js editor server), with WAL mode,
  transaction-scoped optimistic locking, revision rows, and shared
  `PASCAL_DATA_DIR` / `PASCAL_DB_PATH` configuration for MCP and the editor.

### Removed

- Supabase storage adapter, SQL migrations, and the `@supabase/supabase-js`
  runtime dependency.
- Committed MCP `test-reports/` development artifacts.
