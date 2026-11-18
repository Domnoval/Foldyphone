# Loveseat

A low two-seat lounger made from the two pallets on the garage floor, borrowing the stance of a cedar Z-leg lounge chair.

**Status:** plan (v1 published, nothing cut yet)
**Artifact:** https://claude.ai/artifact/7hfcNALKDtw3jA7uMeg7BS (publish `dist/loveseat.html` to this URL to update it)

## References

| file | what it is | what to take from it |
|---|---|---|
| `reference/01-reference-z-leg-lounger.jpg` | Screenshot of an Etsy listing selling build plans for a single cedar lounge chair. | The stance, not the plans. See "moves" below. |
| `reference/02-our-pallets-mockup.jpg` | The garage: one pallet flat as the seat, one leaning on the door as the back. | The actual material and the proportions already being tried. |

### The moves the reference is making

- **The side is one folded line.** Seat rail, raked leg, floor runner: a Z. The foot sits well back from the front edge, so the seat reads as hovering.
- **The seat is a tray.** A mitered frame wraps the slats and hides every end grain.
- **The back is a separate leaning plane.** Wide slats with shadow gaps between two raked uprights.
- **It sits on runners, not feet.** A sled base spreads the load and won't sink into a lawn.
- **Low and tilted.** The seat falls toward the back; this is for lounging, not for dinner.

## Seen, inferred, assumed

**Seen in our photo**
- Two stringer pallets, three stringers each, deck boards widely spaced. The seat pallet's stringers have forklift notches.
- Seat pallet lies with a stringer along the front edge, so its deck boards run front to back.
- Back pallet stands with its stringers vertical and four boards across.
- The back pallet is visibly narrower than the seat pallet.
- Cordless DeWalt drill or driver, a Ryobi cordless tool, a long steel straightedge, fresh sawdust.

**Inferred**
- Both are standard 48 × 40 in pallets (stringers 48, deck boards 40), because the notched stringer and the roughly 5:6 width mismatch fit that size. That would make the seat 48 wide × 40 deep and the back 40 wide × 48 tall. **Needs a tape measure.**
- Stringers are about 1.5 × 3.5 in; deck boards about 0.5 to 0.625 in thick.

**Assumed**
- Two adults sit on it. Pallet deck boards are thin, so wherever a person's weight lands needs a stringer or an added rail under it.
- No saw is visible in the photo. Joinery gets chosen from whatever saw there actually is.

**Things the mockup already tells us**
- A 40 in deep seat is a daybed, not a sofa. Fine with big back pillows; too deep to sit upright in bare.
- A 48 in tall back is taller than it needs to be. The reference back rises roughly 26 in above the seat.
- The 8 in width mismatch has to be resolved one way or the other.

## Brief

- **Replicate or synthesize:** synthesize. Pallets stay whole on new Z-leg side frames.
- **Carries:** two adults, sitting and leaning.
- **Tools:** circular saw, miter saw, jigsaw, reciprocating saw, cordless drill and driver.
- **Lives:** covered porch. Galvanized bolts, exterior screws, sealed on every face.
- **Pallets:** both 48 × 40, confirmed by the user.

## The design

Three identical frames from four 8 ft 2x4s. Each frame is two layers side by side: rail and runner in one, leg and the back pallet's own stringer in the other. Where the layers cross they lap and get one 3/8 in carriage bolt plus two screws; leg laps are glued, back laps are not, so the back unbolts to move. The frames sit 40 in outside to outside so the back pallet's stringers land against them, which leaves the 48 in seat overhanging 2 1/2 in each side. That is how the 8 in width mismatch got resolved.

`model.js` is the design: `build(params)` returns the parts, laps, steps, checks and hardware. `plan.html` only draws what it returns.

Not in v1, worth doing next: infill slats for the wide gaps (needs the real gap width), trimming the back's height, cushion sizes, a half-lap version with the frame in one plane.

## Decisions

- 2026-11-18: Three frames, not two. Pallet stringers are notched for forklifts; spanning 48 in between two frames would put a person's weight over 2 in of wood. A centre frame halves the span and lands between the notches.
- 2026-11-18: Seat height is clamped, not free. Rail and runner share a layer, so at a given tilt the seat cannot go lower than the point where the rail meets the runner (17 3/16 in at 7 degrees). The slider raises the seat and says so.
- 2026-11-18: 3/8 in bolts everywhere to keep it to one drill bit. The six back bolts see about 208 lb each per 100 lb of lean (estimate). If the back ever creaks, 1/2 in bolts in those six laps is the upgrade.
- 2026-11-18: Runner tail is 6 in behind the back. Empty, it takes about 33 lb at the top rail to tip it backward.
- 2026-11-18: Reference image is someone's paid plan listing. We take the principles listed above and design our own piece around the pallets; we do not reproduce their plans.
