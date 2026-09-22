---
'@pascal-app/editor': patch
---

Add an `appearance` prop controlling the editor's colour mode, replacing the
unconditional `document.body.classList.add('dark')`.

Defaults to `'dark'`, so nothing changes for existing hosts. `'light'` clears
the class instead, and `'inherit'` leaves it alone for hosts that embed the
editor in a page whose colour mode they already own. The effect now records
the prior state and restores it on unmount, rather than assuming it set the
class itself.

The layout roots and chrome overlays also pinned `dark` on their own
`className`, which would have made `'light'` and `'inherit'` a lie. They now
inherit from the one class the prop manages. Every one of them sits inside
`document.body` (the mobile panel sheet portals there), so nothing needs its
own copy.

Note this covers the editor's own Tailwind chrome. Scene and floor-plan
colours follow `sceneTheme`'s `appearance` and the new `floorplanPalette`
override, which are independent.
