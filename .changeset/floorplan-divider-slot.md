---
'@pascal-app/editor': minor
---

Add `floorplanDividerSlot` for host-owned split-view dividers.

The divider's pill was a fixed neutral capsule, so a host whose own resize
handles look nothing like it had no way to reconcile the two, and nowhere to
hang a control that belongs on the boundary between the panes.

The slot replaces the pill and receives the handler that starts the pane drag,
so a host can put it on whatever the user actually grabs:

```tsx
<Editor
  floorplanDividerSlot={({ startResize }) => (
    <MyControlGroup>
      <MyToggle onClick={(event) => event.stopPropagation()} />
      <MyGrabHandle onPointerDown={startResize} />
    </MyControlGroup>
  )}
/>
```

The divider itself still starts a drag on pointer down, so controls that aren't
the grab handle need to stop propagation or clicking them resizes the panes.

Only rendered in split view. Omitting the slot keeps the built-in pill, which
also now carries `data-pascal-floorplan-divider-thumb` for hosts that only want
to restyle it.
