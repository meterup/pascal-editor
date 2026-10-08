import { describe, expect, test } from 'bun:test'
import type { PluginNode, PluginNodeType } from './plugin-nodes'
import type { AnyNode as AnyNodeType, BuiltinNode } from './types'
import { AnyNode } from './types'

/** Fails to compile, printing the offending type, unless `T` is `true`. */
type Expect<T extends true> = T
type IsNever<T> = [T] extends [never] ? true : false
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// ── Unaugmented, the extension point costs nothing ──
//
// The guarantee that makes it safe to ship empty: a host loading no plugins
// sees precisely the built-in union, so no existing narrowing changes. Checked
// by `check-types`, not at runtime. If someone augments `PluginNodes` from
// inside this repo these stop holding, which is the point: the host's own kinds
// belong in `AnyNode` the schema, not here.
type _noPluginTypes = Expect<IsNever<PluginNodeType>>
type _noPluginNodes = Expect<IsNever<PluginNode>>
type _anyNodeEqualsBuiltin = Expect<Equals<AnyNodeType, BuiltinNode>>

describe('plugin node augmentation', () => {
  test('does not reach Zod: the schema still parses built-ins only', () => {
    // The type-level registry says what a build can contain; validation stays
    // with each kind's own `def.schema`, which is why the registry-fallback
    // parse path exists. Augmenting must never make the host schema accept a
    // kind it has no schema for.
    const unknownKind = {
      object: 'node',
      id: 'tree_abc123',
      type: 'tree',
      parentId: null,
    }

    expect(AnyNode.safeParse(unknownKind).success).toBe(false)
  })

  test('built-in kinds still parse', () => {
    const wall = {
      object: 'node',
      id: 'wall_abc123',
      type: 'wall',
      parentId: null,
      start: [0, 0],
      end: [1, 0],
    }

    expect(AnyNode.safeParse(wall).success).toBe(true)
  })
})
