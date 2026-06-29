# @pascal-app/nodes

## 0.1.1

### Patch Changes

- f986596: Backport the [**tsgo** adoption change](https://github.com/pascalorg/editor/pull/442) from upstream Pascal primarily for this change to the **@react-three/fiber** JSX interface module augmentation:

  > The blocker for TS 7 here was the react-three-fiber + `three/webgpu` JSX augmentation in `viewer`: mapping the whole `three/webgpu` namespace (`ThreeToJSXElements<typeof THREE>`) made the native checker fail with **TS2320** (heritage conflict on `PMREMGenerator`: core-three's `WebGLRenderer` arg vs webgpu's abstract `Renderer`), **TS2430**, and **TS2590** ("union too complex"). `tsc 6` tolerated it. This narrows the augmentation to the one webgpu node material used as a JSX tag — `<lineBasicNodeMaterial>` — following R3F's "extract the classes you need" guidance. Types-only; runtime `extend(THREE)` is unchanged.
