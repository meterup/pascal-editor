import { afterEach, describe, expect, it } from 'bun:test'
import { useScene } from '@pascal-app/core'

import useEditor, { normalizePersistedEditorUiState } from './use-editor'

const setReadOnly = (readOnly: boolean) => {
  useScene.getState().setReadOnly(readOnly)
}

afterEach(() => {
  setReadOnly(false)
  useEditor.getState().setMode('select')
  useEditor.getState().setTool(null)
})

describe('read-only scenes refuse editing modes', () => {
  it('refuses every mode but select', () => {
    setReadOnly(true)

    // Everything other than `select` exists to change the scene.
    for (const mode of ['edit', 'delete', 'build', 'material-paint', 'terrain-sculpt'] as const) {
      useEditor.getState().setMode(mode)
      expect(useEditor.getState().mode).toBe('select')
    }
  })

  it('still allows select, so nothing gets stuck', () => {
    setReadOnly(true)
    useEditor.getState().setMode('select')

    expect(useEditor.getState().mode).toBe('select')
  })

  it('refuses to arm a tool but always allows clearing one', () => {
    setReadOnly(true)

    useEditor.getState().setTool('wall')
    expect(useEditor.getState().tool).toBeNull()

    useEditor.getState().setTool(null)
    expect(useEditor.getState().tool).toBeNull()
  })

  it('lets an editable scene through untouched', () => {
    setReadOnly(false)

    useEditor.getState().setMode('build')
    expect(useEditor.getState().mode).toBe('build')
  })

  it('refuses a mode that would otherwise move the phase on its way in', () => {
    setReadOnly(true)
    const phaseBefore = useEditor.getState().phase

    // `terrain-sculpt` promotes the phase and the view mode before arming, so
    // a refusal that came after those would leave the editor somewhere new for
    // a mode it then declined.
    useEditor.getState().setMode('terrain-sculpt')

    expect(useEditor.getState().mode).toBe('select')
    expect(useEditor.getState().phase).toBe(phaseBefore)
  })

  it('clamps a persisted editing mode, which never goes through the setters', () => {
    setReadOnly(true)

    const restored = normalizePersistedEditorUiState({
      phase: 'structure',
      mode: 'build',
      tool: 'wall',
    })

    expect(restored.mode).toBe('select')
    expect(restored.tool).toBeNull()
  })

  it('leaves a persisted editing mode alone when the scene is editable', () => {
    setReadOnly(false)

    const restored = normalizePersistedEditorUiState({
      phase: 'structure',
      mode: 'build',
      tool: 'wall',
    })

    expect(restored.mode).toBe('build')
  })
})
