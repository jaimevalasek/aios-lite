# Three.js Patterns — Production Guide

Use this reference for bounded WebGL enhancement on landing pages, showcases, and operational visuals. Three.js must support the content, not become the product unless the user explicitly requests an immersive 3D experience.

## Apply when

- A hero needs atmospheric particles, an aurora field, or one recognizable 3D object.
- Product geometry, spatial relationships, or layered systems communicate meaning better than a flat illustration.
- The experience has a clear static/CSS fallback and a performance budget.

Avoid Three.js for ordinary decoration, text-heavy flows, form screens, low-power targets without fallback, or when CSS/SVG/canvas can deliver the same result more cheaply.

## Dependency contract

Prefer the project package manager when Three.js is already part of the stack. For a standalone HTML artifact, use one pinned ESM version and imports from the same CDN/version:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
</script>
```

Never mix Three.js versions or unpinned CDN URLs. Load optional controls/loaders only for a demonstrated requirement.

## Shared production scaffold

```js
const canvas = document.querySelector('[data-webgl]');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: matchMedia('(min-resolution: 1.5dppx)').matches
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (canvas.width === w && canvas.height === h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const clock = new THREE.Clock();
let frame = 0;
function render() {
  resize();
  const dt = Math.min(clock.getDelta(), 1 / 20);
  updateScene(reduceMotion.matches ? 0 : dt);
  renderer.render(scene, camera);
  frame = requestAnimationFrame(render);
}
render();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(frame);
  else { clock.start(); render(); }
});
```

Production cleanup must cancel the frame, remove listeners/observers, dispose geometries/materials/textures/render targets, and call `renderer.dispose()`. In component frameworks, bind this to unmount.

## Performance budgets

- One renderer and one animation loop per surface.
- Pixel ratio capped at 1.5–2.
- Prefer instancing or one `BufferGeometry` for repeated objects/particles.
- Avoid per-frame allocations; reuse vectors, colors, arrays, and raycasters.
- Keep draw calls low; merge static geometry and share materials.
- Use compressed, right-sized textures; avoid video textures without explicit need.
- Pause offscreen work with `IntersectionObserver` and pause hidden tabs.
- Use delta time, clamp large deltas, and avoid frame-rate-dependent motion.
- Test a mid-range mobile device and integrated GPU, not only desktop.

## Pattern 1 — Particle aurora hero

Use one `THREE.Points` with position, scale/seed, and optional color attributes. Animate through a shader or update only a small uniform set; do not mutate thousands of JS objects per frame.

Scene recipe:

- 800–2,500 particles depending on target.
- Low alpha, additive blending only when contrast remains controlled.
- Two or three brand colors interpolated in the shader.
- Pointer influence limited to a subtle camera/group offset.
- Canvas `aria-hidden="true"` behind semantic hero content.

Static fallback: layered radial gradients matching the dominant particle colors.

## Pattern 2 — Interactive object showcase

Use a single product-relevant mesh or optimized GLTF. Add one key, one fill, and restrained environment lighting. Rotate slowly only while visible. Pointer movement may offset the target rotation; keyboard/content interaction must not depend on the object.

```js
const group = new THREE.Group();
scene.add(group);
const geometry = new THREE.IcosahedronGeometry(1.4, 2);
const material = new THREE.MeshStandardMaterial({
  color: 0x6d5dfc,
  roughness: 0.3,
  metalness: 0.35
});
group.add(new THREE.Mesh(geometry, material));
scene.add(new THREE.HemisphereLight(0xffffff, 0x111827, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(3, 4, 5);
scene.add(key);
```

For GLTF, use Draco/Meshopt only when asset size justifies it. Show a meaningful poster/fallback while loading or after failure.

## Pattern 3 — Scroll-driven parallax layers

Map bounded document progress to a few groups/camera properties. Read scroll once per frame or update a target from a passive listener; interpolate toward it. Do not attach animation logic to every section.

```js
let targetProgress = 0;
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  targetProgress = max > 0 ? scrollY / max : 0;
}, { passive: true });

function updateScene(dt) {
  if (!dt) return;
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetProgress * 1.2, 0.06);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1 - targetProgress * 2, 0.05);
}
```

Disable scroll motion under reduced-motion and preserve the same content order without canvas.

## Pattern 4 — Holographic glass object

Use a small number of transparent meshes, controlled refraction/transmission, and a visible environment. True transmission is expensive; test mobile and fall back to a standard physical material or CSS illustration.

- Keep transparency layers shallow to avoid sorting artifacts.
- Prefer one signature glass object over many glass cards in WebGL.
- Keep emissive/rim effects restrained.
- Avoid unreadable text rendered through glass.
- Provide a no-WebGL image/SVG fallback.

## Pattern 5 — Floating object array

Use `THREE.InstancedMesh` for repeated tokens, nodes, or abstract cards. Store initial transform/phase data in typed arrays and update instance matrices without allocating objects.

Use cases: pipeline nodes, capability constellations, genome blocks, registry items. Keep labels in accessible DOM overlays rather than texture-rendered text unless the 3D text is purely decorative.

## Interaction and accessibility

- Decorative canvas: `aria-hidden="true"` and `pointer-events:none` unless interaction is material.
- Interactive canvas: provide an accessible name, keyboard-equivalent controls, instructions, and DOM alternatives for every action/data point.
- Never trap wheel, touch, or keyboard navigation.
- Respect reduced motion and reduced transparency/data preferences where available.
- Ensure foreground text meets contrast requirements over every animation state.
- Detect WebGL failure and render the fallback without blocking the page.

## Anti-generic rules

- Tie geometry and motion to product meaning; avoid default spinning spheres.
- Use the brand palette and art direction, not neon cyan/purple by habit.
- Keep one visual thesis per viewport.
- Do not combine particles, transmission, post-processing, scroll parallax, and floating arrays merely because they are available.
- Prefer recognizable product artifacts or meaningful system diagrams over random primitives.

## Pre-delivery checklist

- [ ] Content and primary actions work with JavaScript/WebGL disabled.
- [ ] Dependency versions are pinned and consistent.
- [ ] Renderer resizes correctly and pixel ratio is capped.
- [ ] Animation pauses offscreen/hidden and honors reduced motion.
- [ ] No per-frame allocation or duplicate animation loop.
- [ ] Resources are disposed on teardown.
- [ ] Mid-range mobile performance is acceptable.
- [ ] Canvas never covers focus targets or captures unintended gestures.
- [ ] Static fallback matches the composition.
- [ ] The 3D treatment communicates a product-specific idea.
