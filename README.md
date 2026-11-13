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
