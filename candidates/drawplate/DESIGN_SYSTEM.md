# Night Current design system

Gate 1 proposal · CP10. Nick requested a less industrial look, more neon color and energy visibly traveling inside the wires.

| Element | Proposed treatment |
| --- | --- |
| Sculpture | A single asymmetric knot in an optical ribbon. The strands composing the fold separate into round, transparent leads. One dark opening distinguishes its silhouette in a paused view. |
| Color | Ink #050913 supports laser cyan #12D4FF, hot fuchsia #FF2794 and an acid-citron accent #C3F82B. Use a pale core only at the pulse head or contact. Keep ambient space and reading surfaces dark. |
| Light | A packet has a short leading edge and a longer colored tail. It lights the visible filaments inside the wire. Seven sparks leave one occupied contact over a short interval, travel at different speeds and fade into open space. An overlap at different depths produces no sparks. |
| Composition | Keep the inner opening readable and the wires connected through the frame. Set opaque media surfaces at distinct depths. A foreground line covers part of one edge. Titles live in accessible HTML. |
| Type and controls | Spectral Medium Italic for a destination title. Instrument Sans Medium for actions and Regular for reading. Retain legible Index, Contact, Pause motion and Close controls on a stable background. |
| Mobile | Stage the near wire on a portrait-specific curved path. Give one window room to read and keep the next edge peripheral. Preserve touch scrolling, zoom, safe areas and focus. |

## Six-second lighting score

| Time | Event |
| --- | --- |
| 0.12–1.50 s | A pink packet rounds the fold and reaches the knot. |
| 1.50–1.82 s | Cyan starts its long descent. A short branch carries the discharge left. |
| 1.82 s onward | Seven sparks leave that contact over about 0.17 s. Each travels independently and expires within 0.67 s of launch. |
| 2.04–3.78 s | The fuchsia pulse follows a second route and disappears behind cyan. |
| 2.87–4.65 s | Citron answers on the finer return. The trails decay before the loop returns to its opening frame. |

## Proposed site behavior

An initial pulse can play immediately while scroll and the index are already usable. Scroll position controls the camera and windows. The knot turns gently to open the sightline through its center. A wheel flick or immediate reversal maps directly to the new pose. A pulse already inside a wire can finish along its physical path without delaying navigation. Ignore duplicate contact events when multiple scroll inputs cross the same point rapidly.

Hover or keyboard focus sends one short accent along the line serving a visible window and gives its edge a stable highlight. An outline and the label identify focus when motion is reduced. A single tap opens the reading panel. Pause ambient activity while reading, restore focus and exact scroll on close, and support direct links to each destination. Provide static viewpoints and the same linked content if real-time 3D cannot run.

Gate 2 should use real curve geometry for distinct outer sheaths and their emissive cores. One curve-distance signal places the leading edge and wake. Emit sparks in world space from the authored contact. Resolve the visibility of the media and wires against scene depth. Judge highlights against a dark frame and verify that a rear pulse stays hidden behind a front surface. The offline timing sketch is review material.
