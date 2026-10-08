---
'@pascal-app/core': patch
---

Let plugins type their node kinds into `AnyNode` by declaration merging.

Plugin kinds were absent from `AnyNode`, `AnyNodeType` and `AnyNodeId`, so
plugin code and anything consuming it had to widen to `string` or cast. Ids
made it worse: `objectId` produces `` `${kind}_${string}` ``, so a plugin node's
id was never assignable to `AnyNodeId` and generic scene code reached for
`as AnyNodeId`.

Declare kinds in `PluginNodes` and they join all three unions, which restores
exhaustive `switch`es and drops the casts:

```ts
declare module '@pascal-app/core/plugin-nodes' {
  interface PluginNodes {
    tree: z.infer<typeof TreeNode>
  }
}
```

Purely type-level and additive. The interface ships empty, `PluginNodeType`
resolves to `never`, and `AnyNode` stays exactly equal to the new `BuiltinNode`
alias, so a host with no plugins sees no change at all. There is no runtime
component and no API signature churn; `nodeRegistry.get` still takes `string`,
which it has to, since `setPluginDiscovery` allows kinds that were never
compiled against.

Two design points worth knowing:

The interface lives in its own module and is reachable only at
`@pascal-app/core/plugin-nodes`. `declare module` merges only with the module
that declares the interface, and the package entry is a pure barrel, so
augmenting `@pascal-app/core` would quietly declare an unrelated second
interface and widen nothing. Nothing else is exported from that module, so an
augmentation has nothing to shadow.

`PluginNode` adds the common `BaseNode` fields and takes `type` from the key
rather than trusting the declared shape. `AnyNode` is a union, and a union only
exposes properties present on every member, so a declaration that
under-described itself would silently strip `parentId` and friends from
`AnyNode` across the entire host, with the errors landing in host code far from
the plugin responsible.
