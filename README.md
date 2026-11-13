<<<<<<< HEAD
# hoverpic-slim

Hover style for Exolve crossword puzzles.

Shows a picture near the cursor while hovering over a span, or near the finger while a touch is held on it.

## Files

| File | Purpose |
| --- | --- |
| `hoverpic-slim.js` | The script (no dependencies, no setup call) |
| `hoverpic-slim.css` | Required styles for the spans and the floating picture |

## Adding to a page

Include the stylesheet in the `<head>` and the script anywhere on the page:

```html
<link rel="stylesheet" href="hoverpic-slim.css">
<script src="hoverpic-slim.js"></script>
```

No setup call is needed. Spans added after the page loads (e.g. Exolve's rendered clues and its current-clue strip) work too, because the script listens on the document rather than on individual spans.

## Markup

```html
<span class="hoverpic" data-hoverpic="image/11a.jpg">Pic 11a</span>
```

- **`data-hoverpic`** (required): path or URL of the image. Relative paths are resolved against the page, as for any `<img src>`.
- The span's text can be anything; it is also used as the picture's alt text.
- If the image fails to load, nothing is shown.

### Example in an Exolve clue

```
11 <span class="hoverpic" data-hoverpic="image/11a.jpg">Pic 11a</span>, ancient goddess (4)
```

## Behaviour

### Mouse / pen

- The picture appears at the lower right of the pointer and follows it.
- It flips to the other side at the screen edges.
- It hides when the pointer leaves the span or the page scrolls.

### Touch

- Press and hold (350 ms, set by `LONG_PRESS_MS` in the script) to show the picture; lift the finger to hide it.
- The picture is placed above the finger (shrunk to fit if needed), or beside it when there is too little room above (e.g. a strip at the top of the screen). It is never placed below the finger, where the hand is.
- A quick tap or a scroll behaves normally.
- The browser's long-press menu and text selection are suppressed on these spans.

## Customising

Size, border and shadow of the picture are set in `hoverpic-slim.css` on the `.hoverpic-popup` rule — for example, change `max-height: 200px` to adjust the picture height limit.

## License

MIT License. Copyright (c) 2026 Jonathan Sykes.
=======
hoverpic-slim.js
Copyright (c) 2026 Jonathan Sykes. MIT License.
//
Shows a picture near the cursor while hovering over a span, or near the
finger while a touch is held on it. Needs hoverpic-slim.css.
//
MARKUP
  <span class="hoverpic" data-hoverpic="image/11a.jpg">Pic 11a</span>
  - data-hoverpic: path or URL of the image (required). Relative paths are
    resolved against the page, as for any <img src>.
  - The span's text can be anything; it is also used as the picture's alt text.
  - If the image fails to load, nothing is shown.
  Example in an Exolve clue:
    11 <span class="hoverpic" data-hoverpic="image/11a.jpg">Pic 11a</span>, ancient goddess (4)
//
ADDING TO A PAGE
  <link rel="stylesheet" href="hoverpic-slim.css">   in <head>
  <script src="hoverpic-slim.js"></script>           anywhere (no setup call needed)
  Spans added after the page loads (e.g. Exolve's rendered clues and its
  current-clue strip) work too: the script listens on the document, not on
  individual spans.
//
BEHAVIOUR
  Mouse/pen: picture at the lower right of the pointer, follows it, flips at
             the screen edges, hides when the pointer leaves the span or the
             page scrolls.
  Touch:     press and hold for LONG_PRESS_MS shows it; lifting the finger
             hides it. Placed above the finger (shrunk to fit if needed), or
             beside it when there is too little room above (e.g. a strip at
             the top of the screen); never below, where the hand is. A quick
             tap or a scroll behaves normally. The browser's long-press menu
             and text selection are suppressed on these spans.
  Size, border and shadow of the picture are set in hoverpic-slim.css.
>>>>>>> ad28baf6c85f319cb48fcc1a025d5b33e4dd87b3
