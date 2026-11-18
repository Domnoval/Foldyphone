# Foldyphone

A phone-first studio. The person on the other end is on a Samsung Galaxy Fold, usually thumb-typing or dictating, often standing in a garage with a saw nearby. Everything here is built to be made, checked and read from that phone.

## How to work here

- **Replies are read on a phone.** Lead with the thing (a link, a picture, a number). Short paragraphs. No wide tables or long code blocks in chat; put detail in the page.
- **Show, don't describe.** Anything visual gets published as an Artifact and linked. Interactive beats static.
- **Dictated messages are loose.** Read for intent. If a word looks like a speech-to-text miss, go with the obvious meaning.
- **Ask with taps.** When a decision is the user's, use AskUserQuestion with options rather than an open question. One round, not a drip.
- **Photos arrive in chat.** Copy them from the upload path into the project's `reference/` folder with a numbered, descriptive name, and note what each one is in the project README.
- **"Claude Master Folder" on the Desktop** is the user's rule for local sessions. There is no desktop in the cloud; this repo is the equivalent. If a machine is attached, mirror deliverables there.

## Layout

```
kit/          shared by every project
  codex.css     Transmission Codex tokens (Blueprint on screen, Signal in print)
  fold.css      the three postures: cover, open, flex
  fold.js       posture reader, mirrors fold.css
  lumber.js     stock table, fractions, cut list, board packing, overlap checks
  probe.html    Fold Calibration page
projects/
  _template/    copy this to start something
  <name>/       README.md (brief + decisions), reference/ (photos), plan.html (the page)
scripts/
  build.mjs     inline kit files into one self-contained page -> dist/
  shots.mjs     screenshot a built page at Fold sizes -> .shots/
```

`dist/` and `.shots/` are build output and ignored by git.

## The loop

1. Edit `projects/<name>/plan.html`. Link kit files relatively (`../../kit/codex.css`).
2. `node scripts/build.mjs projects/<name>/plan.html`
3. `node scripts/shots.mjs dist/<name>.html` and look at cover, open and flex. Any `!` in the output is a bug.
4. Publish `dist/<name>.html` with the Artifact tool. Record the artifact URL in the project README so a later session updates the same link instead of making a new one.
5. `npm test` before committing if `kit/` changed.

Pages are written in Artifact format: no doctype, `<html>`, `<head>` or `<body>`; start with `<title>` and `<meta name="claude:viewport-fit-sides" content="cover">`. Libraries come from cdnjs, pinned.

## The Fold

Three postures, one layout system (`kit/fold.css`):

- **cover** (under 600px wide): one column. Stage on top, deck scrolls below.
- **open** (600px and up): two leaves meeting at the hinge. Stage holds still on the left, deck scrolls on the right. Keep ink off the centre crease.
- **flex** (half-folded, hinge horizontal): stage on the upright leaf, deck on the flat one.

Touch targets are 55px. Nothing depends on hover. The sizes in `scripts/shots.mjs` are estimates until the Fold Calibration readout comes back from the real phone; when it does, update them and delete this sentence.

## Design system

The user's own system is **Transmission Codex** (a Design System artifact; `kit/codex.css` is a hand sync of its tokens, and its README is the brand book: read it before designing anything new). Rules that bite most often:

- Three faces: Cinzel for titles (uppercase, 0.137em tracking), IBM Plex Mono for data only, Syne for everything else. Inter, Roboto, Space Grotesk and Arial are banned.
- Fibonacci for type (8 13 21 34 55 89) and spacing (3 5 8 13 21 34 55 89 137).
- Radius is 0 or 50%. Lines are 0.5px. Depth is glow, never box-shadow. Grain is always on.
- Nothing animates until the observer acts.
- No cards, pills, numbered section labels, emoji markers, or generic button labels.
- Cinnabar means something is opening. It is 1.3:1 on the Blueprint ground, so it is a fill for solids, never a line or text colour there. Solar is the highlight that reads.

Mode mapping in this repo (my derivation, not in the Codex): screens are **Blueprint**, print is **Signal**.

## Build plans

Use the `parametric-build-plans` skill. Its one rule: the design is a function from parameters to a list of parts, and the 3D view, cut list, stock layout, shopping list and steps are all computed from that list. `kit/lumber.js` holds the shared arithmetic; extend it there (with a test) rather than re-deriving in a project.

Anything that holds a person is a starting design, not engineering. Say so on the plan and name the members that carry the load.

## Git

Work on the branch the session assigns. Commit small, push when a piece is done. Reference photos are committed; build output is not.
