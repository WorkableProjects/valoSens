# ui/

Classic scripts sharing one global scope (no modules, no build). Load order matters; see the tags in `index.html`.

- `styles.css`: all page styles.
- `core.js`: globals `M/X/V`, state (`S`, `freshState`), DOM helpers, input builders, stats parsing.
- `draw.js`: canvas backgrounds, crosshair and enemy drawing, seeds.
- `tests.js`: crosshair visibility test and vision test.
- `questions.js`: choice tables and the `Q` question array.
- `app.js`: navigation, import card, manual form, download, parts bar, `renderQ`.
- `charts.js`: icons, animation helpers, chart functions, previews.
- `results.js`: `renderResult`.
- `main.js`: the initial `renderQ()` call.
