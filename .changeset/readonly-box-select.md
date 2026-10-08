---
'@pascal-app/editor': patch
---

Withhold both 2D box selections on a read-only plan.

The plan has two of them. `isMarqueeSelectionToolActive` draws in plan space and
needs `floorplanSelectionTool === 'marquee'`; `isScreenSelectionToolActive`
draws a screen-space rectangle into `document.body` and is what the default
`'click'` tool uses. Neither consulted `readOnly`, and the screen-space one is
the default, so a plain drag across a locked plan box-selected whatever it
crossed.

What follows is the real problem: once a set is selected, the group affordances
come with it, and a drag moves walls around a scene that then refuses the
write, so the geometry springs back.

`mode === 'select'` isn't enough to gate on, because select is the one mode a
read-only scene is allowed to be in. These are precisely the affordances that
refusing editing modes can't reach — selection-shaped rather than tool-shaped.
