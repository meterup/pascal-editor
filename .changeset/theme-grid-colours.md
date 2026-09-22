---
'@pascal-app/editor': patch
'@pascal-app/viewer': patch
---

Let a scene theme set the ground grid's line colours and idle opacity.

`appearance` hardcoded both colours, and in dark mode `<Grid>` also ignored its
own `cellColor` / `sectionColor` props, so neither a theme nor a host could
adjust how the grid read. That matters because the grid is drawn over the lit
`ground` fill: its contrast against that surface is a property of the pair, and
a light/dark flag can't settle it. `ground` and `backgroundSky` were already
carved out of `appearance` for the same reason.

```ts
const theme = SCENE_THEMES.find((t) => t.id === 'night')
theme.grid = { cell: '#2b2d3a', section: '#343747', idleOpacity: 0.18 }
```

All three keys are optional and fall back to the previous `appearance`-derived
values, so existing themes render identically. `idleOpacity` applies to the
always-on ground reference only; an active placement patch keeps its own
brightened treatment.
