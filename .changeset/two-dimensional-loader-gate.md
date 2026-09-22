---
'@pascal-app/editor': patch
---

Stop gating the editor shell on 3D scene readiness when only the 2D pane is
showing.

In a 2D-only view the 3D pane is `display: none`, so its canvas measures 0x0,
R3F never renders the scene tree, no node renderer calls `useRegistry`, and
`hasCommittedSceneRoot()` stays false. `isViewerSceneReady` is therefore
unreachable rather than merely slow, and every load sat behind the full
`SCENE_READY_FALLBACK_MS` before the fallback fired and logged
`viewer scene readiness timed out`. Measured on a 351-node plan: a consistent
~8s loader over an already-rendered floor plan, with `sceneRegistry` empty
throughout.

This is reachable without a host forcing anything. `viewMode` is persisted in
`pascal-editor-ui-preferences` and restored verbatim by
`normalizePersistedEditorUiState`, so any session that ended in 2D rehydrates
straight back into it on the next load.

The loader now waits only on what a 2D stage actually needs, and the readiness
timeout is skipped entirely in that case:

```ts
const sceneLoaded = !isLoading && !isSceneLoading && hasLoadedInitialScene
const twoDimensionalOnly = isPreviewMode ? previewStageMode === '2d' : viewMode === '2d'
const showLoader = !sceneLoaded || (!twoDimensionalOnly && !isViewerSceneReady)
```

This subsumes the previous `visibleLoader` carve-out, which applied the same
reasoning to the 2D preview stage only, so that variable is gone. Overlay
behaviour for preview is unchanged; 2D-only stages additionally pause the hidden
viewer once the scene has loaded, which costs nothing given it was never
rendering.
