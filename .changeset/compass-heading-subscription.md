---
'@pascal-app/editor': minor
---

Add `onHeadingChange` to the floor-plan compass slot.

`needleRef` is the only way a host gets the per-frame heading, and it's typed
`RefObject<SVGSVGElement>` for the element that visually rotates. That works for
a host whose rotating element is an `<svg>` it owns, and not at all for one
composing an existing icon component, which has nowhere to put the ref and
falls back to re-rendering per commit.

`onHeadingChange` carries the same values as a subscription:

```tsx
floorplanCompassSlot={({ northRotationDeg, alignToNorth, onHeadingChange }) => {
  const heading = useMotionValue(northRotationDeg)
  useEffect(() => onHeadingChange((deg) => heading.set(deg)), [onHeadingChange])
  return <motion.div style={{ rotate: heading }} onClick={alignToNorth}>{glyph}</motion.div>
}}
```

It fires immediately with the current heading, because each source only writes
on its own updates and a still view sends nothing, so a subscriber that waited
would show north until the first movement.

Deliberately a callback rather than an animation library's value type, so the
slot contract stays library-agnostic and a host can drive a plain style write
instead if it prefers. `needleRef` is unchanged.
