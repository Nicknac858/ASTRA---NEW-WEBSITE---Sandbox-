# Drawplate design system

**Proposed at Gate 1.** The two stills set the material and composition targets. The line study defines the closing wire shapes. Nick’s gate decision determines which rules become the baseline.

## Form, light and type

| Element | Direction |
| --- | --- |
| Head | Long hooked titanium jaw with a triangular cut, short chalk-ceramic jaw and a hairline of white between them. The void inside the metal must read at thumbnail size and at rest. Raking light reveals the machined grain and ceramic pores. |
| Wires | Deep cobalt braid, warm copper and pale silver follow different paths through two dark, drilled guides. Show where the cables enter both guides. Preserve perceived thickness in the far view. Keep weave strongest close to camera. |
| Field | Carbon blue-black #0B1016 and graphite #192127 give the silhouette room. Ceramic #E8E2D6 and silver #CBD3D5 carry the brightest surfaces. Cobalt #487BFC and copper #DF8B58 belong to the wires and moments of focus. Light near-white #F6F1E8 appears at the slit. |
| Moving background | A distant plate turns nearly edge-on, the foreground cable uncovers a patch of dark space, and a cold reflection travels down the shoulder as it rotates. At rest a slow light change reveals one surface at a time. Keep particle activity local to an energized wire contact. |
| Typography | Spectral Medium Italic gives a destination name the feeling of a title on a print. Instrument Sans Medium carries the Higher Rank name, Index and actions. Instrument Sans Regular carries reading copy. Set titles in sentence case. Use lining figures for future channel data. |
| Scale and composition | Desktop destination titles 48–72 CSS px, mobile 32–40. Reading copy 18–20 px with 1.45 line height and roughly 50–65 characters per line on wide screens. Keep small controls at least 16 px with 44 px minimum touch areas. Use solid ink behind reading text and an opaque panel for long content. |
| Media | Thin, dark-backed opaque plates with a single light bevel. Use original placeholder imagery and a plainly readable content status on opening. Bring verified material into the same frames later. |

Proposed type specimens and rendering references. [Spectral](https://fonts.google.com/specimen/Spectral) · [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) · [Standard surface materials](https://threejs.org/docs/pages/MeshStandardMaterial.html) · [Video textures](https://threejs.org/docs/pages/VideoTexture.html)

## Scroll score

Percentages give relative positions for the first prototype review. Natural document height can change after touch and wheel trials.

| Scroll | Camera and sculpture | What the visitor perceives |
| --- | --- | --- |
| 0–16% | Start in front of the slit with the camera slightly above it. Upper assembly turns about 20° as the viewer starts down. Upper braid spans flex from the moving guides into fixed lower anchors. | A narrow light pulse transfers from the white slit to the blue braid. An optional Ideas label rests beside the upper socket. |
| 16–34% | Slip below the overhanging jaw and arc toward the first two plate positions. The nearer wire traverses one corner of the rear image. | The far surface grows into an image. Its edge appears once before the visitor can read it. |
| 34–69% | Continue down one curved path between four staggered plates. Each turns at most a small fraction toward the sightline, reaching its readable angle as the previous face leaves it. | Inspiration and Tournament share the upper pass. Highlights and Growth share the lower. The other pair remains in depth. Focus/reading priority follows a visible face. |
| 69–88% | Leave the plates above. Stay alongside the straightening wires. Begin a wide turn toward their staggered ends. | Motion becomes quieter. The project meeting invitation occupies the open side of the lower junction. |
| 88–100% | Settle to a fixed frontal sightline. The three terminals at different depths project into one HR mark. Damp any pointer influence to zero before the join. | One final pulse crosses the joints. The mark holds. Contact stays available as long as the visitor wants. |

## Interaction and access

Native scroll position is authoritative. Camera position, plate angles, lighting accents and upper-assembly pose derive from the same progress. During ordinary scrolling use a short settling interval, initially up to 120 ms. A large scrollbar jump, direct link or direction change cancels the preceding interpolation. Keep autonomous light and sparks on a separate pausable clock.

When a pulse reaches an eyelet, the contact briefly warms and releases two or three tiny motes along the wire’s tangent. They die close to the socket. Limit pulses so rapid scrubbing cannot build a backlog. Pointer hover or keyboard focus lifts the nearby edge light over roughly 140 ms. Never make a plate slide away from the cursor. A legible focus ring is visible even with motion off. Give **Index**, **Contact**, **Pause motion** and **Close** stable text labels. Indicate selected destinations in text as well as color.

Opening a plate records scroll, focus and destination in navigation state. Pause the camera and open an accessible, opaque reading surface. Send keyboard focus to its heading, contain focus while reading, and restore the opener on close, Escape or Back. A cold deep link establishes the nearest named viewpoint and supplies a **Return to the wire** action. History preserves the visitor’s original route when there is one.

## Portrait, loading and fallback

The portrait opening keeps the head in the upper half. During the descent, move the cables to the right third and the nearest window toward the center-left. The next plate can show a thin edge. One thumb reaches the bottom index and content controls. A swipe stays a native page scroll. Preserve pinch zoom, safe areas and scroll position after rotation. The desktop arc and portrait offset have different framing keys but visit the same named places.

Show the name, usable index and a lightweight first composition on initial paint. Begin loading real geometry and the first poster, then replace the still only once a valid frame is ready. Load other posters near their part of the route. Decode video on demand. The three highlight slots can share one active decoder initially. Trial simultaneous muted playback later with the owner’s clips and report what the tested hardware supports.

With reduced motion, use instant changes between authored still views, a stationary index and explicit play controls. Pause motion holds the current frame’s ambient effects and switches scroll navigation to discrete views until resumed. If WebGL is unavailable or the rendering context fails, present the same seven native content destinations with an illustrated index and contact. Preserve the open destination and reading position.

## Proposed prototype stack

Use Three.js with a small TypeScript scene and native HTML for text, links and dialogs. Author original solid meshes for the jaws, tube paths for foreground braids and opaque depth-writing media planes. A narrow material mask follows distance along each cable to place a pulse. Pick only visible plate surfaces and leave the index available for obscured destinations. Keep bloom local to the slit if it improves the still comparison. The final perspective camera and fixed field of view must be calibrated against the wire drawing when the full journey is built. No runtime dependency is needed to review Gate 1.
