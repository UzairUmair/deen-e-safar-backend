# Motion optimization audit — 2026-11-14

## Repository baseline (before edits)

Next.js static export, React 19, TypeScript, hash routing, React Three Fiber demand canvas, drei, Three.js, GSAP ScrollTrigger and Motion. No migration or new animation dependency is needed. Dependencies were absent at checkout; `npm run setup` is required before runtime measurements.

### Measurable source baseline

- DOM timeline follows raw ScrollTrigger progress; `CameraRig` independently damps the same target at lambda 7. After a unit step, the ideal scene still trails by 12.2% at 300 ms and 3.0% at 500 ms, while text has already reached its destination.
- Scene damping clamps elapsed time to 50 ms and snaps at error 0.0003. At a slow software-rendered frame this stretches wall-clock settling. Camera, page rig and lights have implicit frame subscription ordering.
- Each changed opening recomputes normals and uploads unchanged UV coordinates on 8 ribbons (6 loose leaves + 2 stack tops), plus two stack sides. High quality uses 24 segments; low power uses 16 and 4 loose leaves. Geometry is reused and disposed correctly.
- The page curve uses midpoint integration with quadratic sampling; arc length is preserved, but coarse integration accumulates landing error. Closed loose leaves and stack tops share coincident surfaces, risking z-fighting.
- Camera framing already interpolates composition and target together. Preserve it; no competing quaternion smoothing is needed. Portrait/landscape composition switches immediately on resize.
- Book hover uses delta-time damping with the same 50 ms slow-frame cap; it also needs uncapped elapsed time. Three.js pointer-over does not exclude touch. Selected/hovered state is cleared by a separate scroll listener, whose ordering can lag ScrollTrigger.
- GSAP context is reverted on unmount. However the canvas-ready RAF is uncancelled; cursor cleanup and invalidation need lifecycle review.
- Route entrance is 300 ms, 8px, no exit duplication. Every route change resets scroll, including browser history. Initial shell effect can discard a restored partial scroll.
- AI phone and thread each use their own viewport trigger; content arriving after the trigger changes the answer height. Six items stagger 420 ms apart, with a 350 ms lead-in.
- Button foreground changes in 80 ms while its sweep takes 420 ms, so contrast can change before the fill reaches the label. ARIA-disabled links still match hover rules.

## Chosen changes

Retain native scrolling and R3F's demand loop. Use one delta-time exponential controller, then drive the paused GSAP overlay timeline from that exact progress. Set explicit frame priorities; do not add ScrollTrigger scrub damping. Tune lambda to 9 desktop / 13 coarse pointer (95% response ~333 / 230 ms). Keep the existing reversible cover/spine solver and improve curve integration, surface separation, and buffer work. Keep responsive camera composition; ease resize and language recomposition without delaying scroll motion. Coordinate the AI under one viewport trigger with reduced-motion support. Preserve providers, audio ownership, API calls, routing and fallback policy.

## Runtime comparison protocol

Use installed Chrome with forced SwiftShader (`?3d=force`) for reproducible software WebGL, recorded API fixtures, identical 1440×900 viewport and scroll paths. Record RAF intervals, long tasks, screenshots at 0/.15/.30/.45/.60/.75/.90/1 and a rapid .20/.80/.45/0 reversal, plus stop/resize/history and responsive checks. Run baseline before editing implementation, save JSON under `docs/motion-evidence/`; compare with the same protocol after edits. These are software-browser measurements, not physical GPU or phone results. Record actual results and limitations in the final report.

## Verification findings and final strategy

Repeated browser reversals exposed stale progress (including a ScrollTrigger target of 0.4386 while actual `scrollY` was 1) under virtualized browser clocks. Native event delivery could lag the simulated RAF even with an advancing emulated clock. Final motion QA offsets only Date and preserves native RAF/performance/timers/scroll delivery; tests wait for actual progress convergence. The final implementation also simplifies ownership by measuring native scroll against cached layout bounds. GSAP remains the paused overlay timeline; R3F remains the only smoothing/render clock. No normal-browser ScrollTrigger defect or production FPS claim is inferred from those virtual-clock failures.

Recorded transition review also exposed empty framing between subjects and a fully faded sticky viewport before release. A wider establishing camera key and retaining the settled scene through native release address those gaps. History and reload checks led to session-only, debounced scroll-position persistence with layout-aware restoration.
