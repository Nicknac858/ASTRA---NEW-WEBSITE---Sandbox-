# Night Current quality and evidence

| Check | Evidence |
| --- | --- |
| Easy to distinguish the three routes | The two new concept images depict cyan, hot fuchsia and citron filaments. The foreground cyan line deliberately carries the strongest pulse. |
| Charge travels along a path | The [timing sketch](studies/night-current/pulse.gif) moves a short bright head and a longer tail along drawn routes. It includes an incoming wave, a fork, a delayed echo and a rest. |
| Sparks originate at contact | Seven independently timed strokes fly from the side contact. The lower depth crossing stays quiet. |
| Animation file works | Decoded all 90 frames of the 640 × 360 GIF. Its delays total 6.00 seconds. Seventy-five frames differ from rest. The final decoded composition matches the opening frame. |
| Art direction and browser evidence distinguished | The photographic keyframes and timing sketch establish an appearance and rhythm. Testing the actual camera, depth buffer, browser frame time, 4K television output and Galaxy S23 Ultra is work for an approved runnable prototype. |
| Reference and scope | Direct reference access limits and the historical walkthrough are recorded in [CP09](https://github.com/Nicknac858/ASTRA---NEW-WEBSITE---Sandbox-/blob/f8414623079619558944acf3ce40502289513053/candidates/drawplate/README.md). Preserve the spatial plan and content placeholders. |

For Gate 2, record a forward and reverse descent, a paused frame and at least one verified occlusion at each camera angle. Exercise keyboard, touch where available, position restoration, reduced motion and the illustrated fallback. Record actual browser, GPU, display mode, CSS viewport, device pixel ratio, drawing-buffer resolution, active video count, median and 95th-percentile frame times. Separate device results from emulation. Nick decides whether to advance.

## CP11 · Working preview

| Check | Observation |
| --- | --- |
| Optical material | The two original images supply the surface textures. Each ribbon has a separate curved front and back, an authored depth profile, cylindrical inner filaments and a distance-based light pulse. Opaque image planes write depth. Concentrated glass highlights also participate in the depth pass. |
| Contact and crossings | The side branch and return filament meet at the modeled spark emitter. Seven trails originate there. At the opening, the near cyan surface leads the pink descent by 183 scene units at their projected crossing. The upper bridge leads the incoming fold by 251. At the descended viewpoint those separations are 169 and 281 units respectively at the corresponding intersections. |
| Real browser | Chrome 156 on Linux exercised the Canvas renderer. The 1152 × 648 CSS desktop viewport rendered to 1152 × 648 at DPR 1. A separate 390 × 844 CSS viewport rendered the portrait model at DPR 1 without horizontal overflow. Both used zero active videos. |
| Interaction | Forward and reverse, both media planes, index selection, Back, keyboard Escape, restored focus and scroll position, reading pause, and manual pause/play were exercised. A simulated reduced-motion preference kept the initial clock at zero, offered explicit Play and allowed a direct return to the opening at scrollY 0. The two reading panels identify concept imagery. |
| Motion evidence | The MP4 contains 168 distinct time samples, 1152 × 648 at 24 fps for 7.00 seconds. It samples the compatibility renderer through the camera move and back. The embedded WebP contains 105 frames. These files show the choreography independently of browser scheduling. |
| Timing | The cloud desktop returned a median interval of 183 ms and a 95th percentile of 600 ms across 13 initial callbacks. This environment did not demonstrate smooth real-time playback. At 1152 × 648, 34 synchronous Canvas paints measured 44.9 ms median and 50.1 ms p95. The interactive compatibility path reduces its drawing resolution when repeated paint calls take over 42 ms. |
| Main shaders | The exact primary renderer’s geometry, uniforms, textures and ordered draw commands were replayed on Mesa 25.0.7 llvmpipe, OpenGL ES 3.2. Both GLSL stages compiled and linked and four viewpoints rendered with no GL error. [Primary material at the spark, software GLES](slice/review/Shader-material.jpg) |
| Device limits | The review browser reported WebGL 2 unavailable. Physical GPU/browser performance, physical touch, OS-level reduced-motion activation, 4K television output and Galaxy S23 Ultra hardware remain open. `qa/browser.py` exercises the WebGL path in an equipped Chrome and includes a touch and reduced-motion case. |
