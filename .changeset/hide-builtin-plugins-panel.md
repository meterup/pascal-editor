---
'@pascal-app/editor': patch
---

Let `hideBuiltInOverlays` hide the built-in Plugins panel.

The flag cleared the floating overlays but left the Plugins manager in the rail,
which `useHostPanels` appends in the `edit` workspace. A host passing
`sidebarTabs={[]}` still got a non-empty tab bar, so the v2 layout rendered its
left column for a panel the host never asked for. Capture mode used to cover
this, which is exactly the coupling `hideBuiltInOverlays` exists to break.

The flag now drops that panel too. Host panels and registered plugin panels are
untouched, so a host can hide the built-in rail entry and still show its own.
