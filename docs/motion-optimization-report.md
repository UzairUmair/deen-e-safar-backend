# Motion optimization report

## Result and architecture

The existing design, static export, hash URLs, data providers and guest features are retained. No dependencies or service configurations changed. Installed Next.js is 16.4.2; its bundled client-boundary, lazy-loading and static-export guides were read before implementation.

Before: native scroll → GSAP overlay timeline at raw progress; independently → R3F camera damping → Quran. Fast scrolling could put the overlays ahead of the book. The 50 ms delta cap also made the response take much longer on slow frames.

After: native scroll → cached layout-based target → one exponential progress controller in R3F → camera, Quran rig and paused GSAP overlay timeline. Explicit negative frame priorities put progress/camera before geometry and lighting. Native measurement removes the extra ScrollTrigger scheduling/cache step. Bounds are cached on layout/viewport changes; the passive scroll handler reads only `scrollY`, and scrolling below the settled story does not invalidate WebGL. Layout offsets exclude the route entrance's temporary transform. There is no added scrolling library, wheel interception, GSAP scrub smoothing, per-frame React state, or competing RAF scene loop. Desktop lambda 9 reaches 95% in 333 ms; coarse-pointer lambda 13 reaches it in 230 ms. Endpoint tolerance is reduced to 0.00001. The controller remains bounded and reversible.

QA also exposed a test artifact: virtualized browser clocks could leave scroll delivery behind simulated RAF. Final motion tests preserve native RAF/performance and apply only an advancing date offset for recorded API fixtures. This separates the production motion findings from artificial-clock failures.

## Changes

- **Quran:** preserved the two-hinge cover/spine mechanism, stationary back-board/rehal contact, grouped page stacks and blank decorative pages. Three-point Gauss integration reduces mobile page-tip integration error. Continuous, microscopic book-space leaf spacing reduces coincident-surface flicker without flipping when a page passes vertical. Analytic ribbon normals replace repeated triangle-normal reconstruction; static ribbon UVs are uploaded once instead of every opening frame. Geometry tests sweep 201 opening states and check hinge attachment, determinism, finite coordinates and low-resolution tip accuracy.
- **Camera and shelf:** camera and target retain their shared composition interpolation. A wider establishing key keeps both subjects visible during the shelf-to-Quran journey rather than framing their empty gap. Resize and RTL recomposition blend position and quaternion over 240 ms, without adding another scroll filter. Entrance drift is confined to the shelf; revisiting a partial story does not replay the camera introduction. Book hover shares the tested damping helper, removing its remaining 50 ms elapsed-time cap. Touch cannot trigger 3D hover; tap and keyboard chip selection remain available. Shelf state clears once when crossing its interaction boundary.
- **Homepage:** copy/cards use smaller translations and a coordinated preview stagger. Background and text now follow the same progress as the Quran. The final pose remains visible until the sticky stage naturally releases, removing its previous empty-viewport fade. Section reveals start earlier and respect reduced motion. AI phone and messages share one viewport trigger, with an ordered 180 ms stagger, reserved answer space and non-shrinking message blocks. Real bundled text and the illustrative-preview labels are preserved.
- **Navigation:** a 220 ms entrance retains one mounted destination and the existing provider hierarchy. History entries retain scroll positions; a debounced, session-only position save supports reload, and a bounded ResizeObserver waits for lazy layout. Hash routing and reader query behavior are retained. Storage failure does not block navigation.
- **Buttons:** reversible 320 ms transform sweep, consistent foreground contrast across both partial fills, keyboard focus sweep, touch pressed state, reduced-motion handling and ARIA-disabled pointer exclusion. No JavaScript hover loop.
- **Mobile and lifecycle:** DPR caps reduced from 1.75/1.5 to 1.5/1.25 (desktop/low power); existing 4-leaf/16-segment mobile model, shadow reduction, responsive camera and fallback rules remain. Canvas-ready RAF is now cancelled on unmount. Explicit PCF shadow selection avoids the removed PCFSoft mode. The existing `?3d=force` override remains for controlled software-renderer QA; reduced motion still wins.

## Before/after evidence

Chrome, 1440×900 at DPR 1, development servers, recorded API responses and the same scroll/capture path. The original SwiftShader baseline was recorded before editing implementation. A native GPU control was subsequently run from original commit `9d8e3da` in a detached checkout with identical locked dependencies; native before/after used the same AMD Radeon ANGLE/D3D11 renderer. See [GPU probe](motion-evidence/gpu-probe.json).

JSON, eight screenshots per run and WebM recordings are in [motion-evidence](motion-evidence/). Native recordings: [before](motion-evidence/before-native/scroll-story.webm), [after](motion-evidence/after-native/scroll-story.webm). At 15% the new establishing view keeps both subjects visible; at 100% the settled Quran and previews remain visible instead of fading to an empty sticky stage.

| Native AMD/ANGLE observation | Before | After |
| --- | ---: | ---: |
| RAF interval median | 18.0 ms | 18.0 ms |
| RAF interval p95 | 18.2 ms | 18.3 ms |
| Intervals over 33.4 ms | 1/784 | 0/796 |
| Observed long tasks | 146 ms | None |
| JavaScript exceptions during capture | 0 | 0 |

Native median cadence is approximately 56 Hz in this capture environment. Frame rate was already near the desktop goal; the primary gain is coordinated motion, stable reversal and less redundant work. The 0.1 ms p95 difference is not evidence of a meaningful regression.

| SwiftShader stress observation | Before | After |
| --- | ---: | ---: |
| RAF interval median | 150 ms | 33.4 ms |
| RAF interval p95 | 316.6 ms | 200.1 ms |
| Intervals over 33.4 ms | 134/168 (79.8%) | 146/282 (51.8%) |
| Observed long tasks | 419, 113 ms | 281 ms |
| JavaScript exceptions during capture | 0 | 0 |

| Source-level work | Before | After |
| --- | ---: | ---: |
| High-quality ribbon UV rewrites per opening update | 8 | 0 |
| Full ribbon triangle-normal reconstructions per update | 8 | 0 |
| Maximum DPR, desktop / low power | 1.75 / 1.5 | 1.5 / 1.25 |

These single-run RAF measurements include pauses, screenshot overhead and demand-loop idle time. Faster settling creates more idle intervals; the median is **not** a GPU-render-time benchmark or a 60 FPS claim. Slow-frame tails remain substantial on SwiftShader. Dev compilation and concurrent test runs caused timeouts during an intermediate verification attempt; final browser verification uses the production static export sequentially.

Opt-in `?3d=force&motion-debug` exposes progress and Three.js resource/render counters on the canvas only for QA. `frontend/scripts/verify-motion.mjs` records temporal samples in `motion-evidence/temporal.json`, verifies the DOM backdrop against actual smoothed progress, and tests reversal, native wheel input, stops, resize, language, reload, history and offscreen idling. Its frame counter confirms that scrolling below the settled story adds no WebGL frames. This exercises animation over time rather than inferring smoothness from screenshots. Renderer counters are draw/triangle/resource counts, not texture VRAM measurements.

## Validation

| Check | Result |
| --- | --- |
| `npm run build` | Passed, static export |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 81 passed across 6 files |
| `npm run verify` | Passed: 114 chapters / 6,236 verses, source fidelity, Duas, Hadith, backup and translation checks |
| `npm run verify:ui` | All 12 passed, including 320/360/390/430/768/1024/1440px, RTL, reduced motion and disabled WebGL |
| `npm run verify:app` | All 22 passed, including reader/audio, bookmarks, reading position, prayer/countdown, Duas, dashboard and preferences |
| `npm run verify:motion` | All 7 passed on SwiftShader and native AMD/ANGLE |

Browser suites use the production static export and recorded provider responses. Logs are under `motion-evidence/`. Live network API checks were not rerun because API implementations did not change.

## Review

1. Run `npm run setup`, then `npm run dev`. Visit `http://127.0.0.1:3000/` on an accelerated browser. Use `?3d=force` only to inspect the live scene on a software renderer.
2. Scroll slowly, jump forward, reverse at 20/80/45/0%, stop halfway, and open/close repeatedly. Resize or switch English/Urdu midway. Follow the Explorer CTA, then use Back/Forward; refresh partway down the story.
3. Check keyboard focus and hover reversals on buttons; tap bookshelf chips on mobile. Scroll to the AI preview and back: the sequence should run once and keep its final layout.
4. Enable reduced motion: the static Quran/bookshelf layout and links remain available. The 3D override does not bypass this preference.

For reproducible captures in PowerShell, use `npm run measure:motion -- after` (SwiftShader). For native GPU, set `$env:MOTION_GPU='native'` and run `npm run measure:motion -- after-native`. Set `$env:BASE` if the server is not at port 3000. `MOTION_GPU=native` also enables native rendering in `verify-motion.mjs`; UI tests explicitly retain the software stress configuration.

## Files changed

- `frontend/app/components/three/{story,CameraRig,HomeScene,QuranBook,QuranPages,quranRig,BookModel}`: controller, frame ordering, camera composition, buffers, integration, lifecycle and touch.
- `frontend/app/components/home/{QuranScrollSection,AIShowcase}` and `frontend/app/components/motion/RevealSection`: synchronized DOM choreography and reveal behavior.
- `frontend/app/lib/router.ts`, `frontend/app/page.tsx`: history positions and route entrance.
- `frontend/app/styles/{animations,homepage}.css`: buttons, phone stability.
- `frontend/tests/unit/motion.test.ts`, `frontend/scripts/{verify-motion,measure-motion}.mjs`, `frontend/scripts/verify-ui.mjs`, `frontend/scripts/lib/harness.mjs`: mathematical, temporal and visual checks; fixture dates anchored without virtualizing native RAF, timers or scroll delivery.
- This report, the audit, and local visual/temporal evidence.

## Limits

Native AMD/ANGLE and SwiftShader were tested; no physical phone, VRAM profiler, React DevTools profiling session or exhaustive mesh-intersection solver was used. The checks establish deterministic hinges/curves and inspect representative geometry; they do not prove every triangle pair is collision-free. Browser viewport/touch emulation is not physical-device testing. Physical trackpad inertia and mobile browser chrome/orientation behavior still need device review. Single-run RAF samples do not guarantee sustained 60 FPS on every device. Reload position persistence requires session storage; unavailable storage does not block navigation. Three.js's Clock deprecation warning originates in the installed R3F dependency; no dependency migration was attempted.
