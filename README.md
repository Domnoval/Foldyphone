# Foldyphone

A studio that fits in a folding phone. Send a photo and a sentence from the garage; get back a 3D model you can spin with a thumb, a cut list, and a build order.

## Using it from the phone

1. Open this repo in Claude Code on the Fold.
2. Say what you want to make and drop in photos.
3. Answer a few taps.
4. Open the link that comes back. It reshapes itself when you fold, unfold, or half-fold the phone on the bench.

## What's in here

| | |
|---|---|
| `projects/` | One folder per build: the brief, the reference photos, the plan page. |
| `kit/` | The shared parts: the Transmission Codex look, the fold-aware layout, the lumber maths. |
| `scripts/` | Build a page into one file; photograph it at Fold sizes before it ships. |
| `CLAUDE.md` | The house rules Claude reads at the start of every session. |

## Projects

- [`loveseat`](projects/loveseat/) — two pallets and a lounger with a Z-leg stance.

## Commands

```
npm test                                        # kit arithmetic
node scripts/build.mjs projects/loveseat/plan.html
node scripts/shots.mjs dist/loveseat.html
```
