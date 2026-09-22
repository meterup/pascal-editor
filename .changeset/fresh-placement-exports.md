---
'@pascal-app/editor': patch
---

Export the rest of the fresh-placement helpers: `createFreshPlacementSubtree`,
`prepareFreshPlacementRootDuplicate` and `duplicatesAsFreshSubtree`.

Only `commitFreshPlacementSubtree` was exported, so a host driving its own
placement flow could finish a draft but not start one. It had to reimplement
the create half, including the `metadata.isNew` convention, and then drift from
it. `duplicatesAsFreshSubtree` is the predicate that picks between the subtree
and root-duplicate paths, so it ships alongside them.
