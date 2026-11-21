# ARCHIVED — NOT APPROVED FOR HIGHER RANK

Owner decision, November 21, 2026: archive this last design; not approved; may use for another client. This supersedes all approval language below. Preserve the snapshot. No active design is selected by this archive.

---

## Historical CP07 checkpoint

# Afterimage — CP07 / typography and interaction edition 03
Date: November 18, 2026 (America/Los_Angeles).
Latest owner instruction: review available skills/plugins, improve fonts substantially, add elegant mouse-over motion. Implemented within the accepted Afterimage direction. Final creative approval remains with Nick.

## What changed
- Self-hosted Hanken Grotesk variable for interface, body and disciplines; Bodoni Moda variable roman/italic for studio name, index, contact and scene captions.
- Corrected optical sizing, hierarchy, tracking and spacing. Body copy is 16px or larger; navigation and regular controls 14px. Secondary metadata mostly 12px.
- Thin warm exposure lines reveal over links, disciplines and contact; service labels travel 6px and increase weight, index labels travel 9px. Click targets remain stationary.
- Navigation labels lift 2px, existing glyphs respond subtly, contact details shift 3px. Fine-pointer movement is optional; keyboard focus remains visible.
- Dialog content settles in over 750ms, with a restrained stagger across index entries. Service descriptions open/close over 420ms, including interrupted clicks.
- Pause disables interface transitions/animations and finishes active disclosures. OS reduced motion disables decorative animation; native content remains accessible.
- Original art, scroll journey, positioning and motion edition 02 renderer preserved. No production/Claude/Nebula changes.

## Evidence and limits
- Build, JavaScript syntax and diff whitespace checks passed. Three local WOFF2 files and their licenses are in the build; no remote font dependency.
- Browser font checks returned true for Hanken, Bodoni roman and Bodoni italic. Visual hierarchy inspected at arrival, studio, index and contact.
- Real desktop pointer hover observed in flight and settled: label moved 6px, weight reached 500, exposure line reached full width. No synthetic hover state injected.
- Service open/switch/close exercised: expanded state, hidden detail and visible copy remained consistent. Index keyboard focus and Escape focus return checked.
- Manual Pause returned interface transition duration 0s; Enable motion restored the running state.
- 390x844 CSS-pixel iframe viewport: studio, index and contact inspected; document and index width 390 with no horizontal overflow. Test fixture excluded from deployment.
- Physical touch devices and OS reduced-motion preference activation were not tested. Reduced-motion implementation was source-reviewed.
- Browser uses Canvas compatibility rendering (software-3d); WebGL fidelity and real-device frame rate remain unverified from CP06. This turn did not modify the renderer.
- Screenshot evidence: /workspace/shared/afterimage-type-03.jpg (temporary, same-source local preview).

## Resume / next action
Review Nick's feedback on typography/hover edition 03 and refine only concrete feedback. Preserve Afterimage; do not replay rejected concepts. Primary WebGL and physical-device verification remain open.
Pre-typography rollback: 947fa99935fd4cb1470f440c38ec326342ee6f0e (motion edition 02).
First candidate rollback: 75b161c571c5d7fa906a1c148df1b4ff5298ed36.

## Source map and identity
public/style.css: font faces, edition 03 typography and interaction layer.
public/index.html: semantic type spans and font preloads.
src/main.js: scroll, dialogs, animated accessible disclosures and pause.
build.mjs: local font/license copying and bundling.
src/motion.js, src/world.js, src/software.js: preserved motion edition 02 rendering.
Site: appgprj_6afd0c487a048191ac5cfbd0a4478f49
Path: /workspace/sites/higher-rank-afterimage
Canonical control: libfile_79817efa388881918262f9d8003f14ff
Exact source revision/deployment: Sites version history and canonical control document.
Original Higher Rank production, approved Nebula and Claude's work remain outside this isolated source.
