import type { BaseNode } from './base'

/**
 * The augmentation point for plugin-contributed node kinds.
 *
 * Its own module on purpose. `declare module` merges only with declarations in
 * the module it names, never with a re-export, and the package entry is a pure
 * barrel — so augmenting `@pascal-app/core` would quietly declare a second,
 * unrelated interface instead of widening this one. Keeping it here, reachable
 * only at `@pascal-app/core/plugin-nodes`, makes the target unambiguous and
 * leaves nothing else in scope for an augmentation to shadow.
 */

/**
 * Type-level registry of plugin-contributed node kinds, keyed by the `type`
 * discriminant and valued by the node's parsed shape.
 *
 * Empty here. A plugin widens it by declaration merging, which folds its kinds
 * into `AnyNode`, `AnyNodeType` and `AnyNodeId` for every consumer that
 * compiles against the plugin:
 *
 * ```ts
 * import type { TreeNode } from './schema'
 *
 * declare module '@pascal-app/core/plugin-nodes' {
 *   interface PluginNodes {
 *     tree: z.infer<typeof TreeNode>
 *   }
 * }
 * ```
 *
 * Values have to be node shapes, carrying `id` and `type` like any other node.
 * Without that, indexing `AnyNode['id']` fails and the error points at the
 * offending declaration.
 *
 * Three things this deliberately is not:
 *
 * - **Not a runtime claim.** It describes what a build *can* contain, not what
 *   is loaded. Plugins register asynchronously, so a declared kind still reads
 *   `undefined` from `nodeRegistry.get` until its plugin lands, and the
 *   registry remains the only source of truth at runtime.
 * - **Not validation.** `AnyNode` the Zod schema still parses built-ins only.
 *   Plugin nodes are validated through their own `def.schema`, which is what
 *   the registry-fallback parse path already does.
 * - **Not exhaustive.** Kinds discovered at runtime rather than compiled
 *   against, which `setPluginDiscovery` permits, cannot appear in any union and
 *   stay plain `string` by necessity.
 */
// Must stay an `interface`, and must stay empty: hosts fill it by declaration
// merging, which works on interfaces only. Taking `noEmptyInterface`'s "safe"
// fix to `type PluginNodes = {}` turns every augmentation into a redeclaration
// (`TS2300: Duplicate identifier`), silently removing the only way to
// contribute a kind. The rule's autofix has done exactly that before.
// biome-ignore lint/suspicious/noEmptyInterface: emptiness is the feature
export interface PluginNodes {}

/** `type` discriminants contributed by plugins; `never` when none are declared. */
export type PluginNodeType = Extract<keyof PluginNodes, string>

/**
 * Node shapes contributed by plugins; `never` when none are declared.
 *
 * Two guarantees are added rather than trusted, because `AnyNode` is a union
 * and a union only exposes properties present on *every* member. A declaration
 * missing one would silently strip it from `AnyNode` across the whole host,
 * and the resulting errors would land in host code far from the plugin that
 * caused them:
 *
 * - the common node fields, which every `def.schema` has anyway by extending
 *   `BaseNode`, so this only rescues a declaration that under-describes itself
 * - `type`, taken from the key, so it cannot be omitted or drift from it
 *
 * `id` still has to come from the declared shape, since its prefix is the
 * kind's own business and widening it to `string` would collapse `AnyNodeId`
 * for everyone.
 */
export type PluginNode = {
  [K in PluginNodeType]: Omit<BaseNode, 'id' | 'type'> & { type: K } & PluginNodes[K]
}[PluginNodeType]
