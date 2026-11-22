# Resume Night Current

**CP11 · Working visual slice ready for Nick’s review · November 21, 2026**

| Item | Current state |
| --- | --- |
| Repository | `Nicknac858/ASTRA---NEW-WEBSITE---Sandbox-` on `astra/drawplate` |
| Review | [Watch the motion and download the offline preview](slice/review/README.md) |
| Owner decision | Nick approved the CP10 artwork and asked for it to move while keeping that appearance. The full journey follows a separate review. |
| Approved image | [Original wide art](studies/night-current/night-current.png), blob `f3110c7f9da07905760cb8402fd8f60da465cda3`. The original portrait and six-second photographic study were also recovered in `45f56f857abf9ac355636ef8e8524e32abe0dc8f`. |
| Prior checkpoint | `a58c3ad08ff1e35e6ad4d7e0b2a821596675c265` is the CP10 handoff. `dcf3c4083d2b13cb03860c8c673bc42e14ae60d8` records the artwork approval. |
| Source | [Slice implementation](slice/) and [browser verification script](slice/qa/browser.py). The [approval register](../../APPROVAL_REGISTER.md) governs progression. |
| Verification | Scroll forward and back, selecting both planes, keyboard Escape, focus and position restoration, pause/play, desktop and portrait composition. [Tests and limits](QUALITY_CHECKLIST.md) |
| Next decision | Nick can approve the working slice for Gate 3, request a specific change, or stop. Publication remains a separate decision. |

### Reproduce

Open `slice/Night-Current.html` directly, or extract its byte-identical copy from the review ZIP. Everything the preview uses is embedded in that file.

From `slice/`, `python build.py` builds the standalone file. A fresh checkout requires Python with NumPy, SciPy and Pillow with WebP support. `python bake.py` rebuilds the material atlases after changes to the authored guides. Both original study PNGs and the two licensed, self-hosted fonts are in the repository.

The latest reviewed HTML has SHA-256 `03c0ec25e9c766d8861cdbca927187d5949e32a26007f1320a99e37ecb33fb4d`. The runtime contains no external asset requests.
