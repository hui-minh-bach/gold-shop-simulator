GOLD SHOP SIMULATOR - CHARACTER ASSET CONTRACT (V1.2 MOTION ACCURACY)

The runtime prefers local final character assets in this folder:
- owner_m.glb  -> final male shop-owner/staff humanoid
- owner_f.glb  -> final female shop-owner/staff humanoid

Required contract:
- glTF/GLB 2.0, Y-up, meters, feet on Y=0 after normalization
- skinned humanoid with a stable skeleton
- supported bone names include Quaternius (pelvis, spine_01, upperarm_l...),
  Blender/Mixamo aliases (Hips, Spine, LeftArm...) and the aliases documented in v1-real3d.js
- recommended web budget: 25k-60k triangles for the hero owner, 1k/2k textures,
  no more than 4 skin weights per vertex when practical
- PBR metallic/roughness materials; avoid uncompressed 4K textures for this web build

Load order:
1) owner_m.glb / owner_f.glb from this folder
2) pinned public rigged fallback (when Internet is available)
3) built-in local procedural humanoid (gameplay-safe fallback)

The old block/capsule mannequin is no longer the required fallback. The built-in V1.2
humanoid has human-like proportions, articulated forearms/knees/hands/fingers and separate
male/female silhouettes so the game remains playable even if network character assets fail.


V1.2 ANIMATION SUPPORT
- Recommended clip names: Idle, Walk, Run, Talk (case-insensitive; longer names containing these words are accepted).
- Locomotion clips are blended with THREE.AnimationMixer.
- Static rigged GLBs are still supported through procedural bone motion.
- Do not use the rejected primitive/mannequin GLBs as final owner art.
