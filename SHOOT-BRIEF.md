# Photography brief — Æsir Automotive

**Why this exists:** the design is now better than the photographs can support. Every
image on the site is under 700px wide, and the new layouts display them at up to
1200px — 2400px on a retina screen. Measured upscale factors on the current build:

| Placement | Source file | Displayed @2x | Upscale |
|---|---|---|---|
| Photo essay, opening plate | `z3-workshop.jpg` 332×461 | 1491×1120 | **4.5×** |
| Photo essay, wide plate | `f430.jpg` 577×640 | 2400×920 | **4.2×** |
| Photo essay, large of pair | `bearings.jpg` 512×640 | 1436×680 | **2.8×** |
| Services index plate | `bearings.jpg` 512×640 | 1185×1482 | **2.3×** |
| About | `workshop.jpg` 640×640 | 1128×1240 | **1.8×** |

Anything above about 1.2× is visibly soft. A design juror reads that as amateur
instantly, and no amount of code fixes it. **This shoot is the single highest-value
thing left on the project.**

---

## What's needed, in priority order

### 1. Neil — the portrait ⭐ the most important frame on the list
The entire site argues *"the person you speak to is the person under your bonnet"*
and there is currently no photograph of that person. Needed:

- **One environmental portrait**, Neil at the bench or beside a car on the ramp,
  looking at camera. Not smiling-for-a-brochure — working expression, hands
  visible, hands not clean.
- **Two or three working frames**: Neil actually doing something — torquing,
  measuring, a head in his hands under the light.
- **One pair of hands close-up** holding a component (a bearing shell, a head).

Shoot at f/2.8–4 so the workshop falls away slightly behind him. Minimum 3000px
on the long edge. Landscape *and* a portrait-orientation frame of each — the
layouts need both.

### 2. The workshop itself
The only premises shot is years old and shows a fit-out in progress, on a site
whose whole argument is "this is a real workshop".

- **Wide establishing shot** of the floor with a car on the ramp. Landscape,
  minimum 3000px wide — this one goes full-bleed.
- **The tool wall.** Detail, shallow depth of field.
- **The bench** with a job laid out on it.

### 3. The signature engine work
This is what nobody else does, and it deserves proper coverage. Ideally shot as
a **sequence on one job** — the same engine at four or five stages:

1. In the car, before.
2. Out, on the stand.
3. Stripped — components laid out in order on the bench. *(Shoot from directly
   overhead, on a clean dark surface, even lighting. This is the money shot and
   the current version of it — `bearings.jpg` — is the best photo on the site
   despite being 512px.)*
4. A machined surface close-up.
5. Back in, running.

Overhead layout frames want to be square or portrait, minimum 3000px.

### 4. Cars, properly
One good frame each of the marques the site claims: an M car, a classic, the MINI
or i8, and something exotic if one's in. Three-quarter front, low angle, in the
workshop rather than outside.

---

## Technical requirements

- **Minimum 3000px on the long edge**, RAW or maximum-quality JPEG. Phone is
  acceptable if it's a recent one shot in good light — resolution matters more
  than the camera.
- **Shoot both orientations** of every important subject.
- **Leave headroom** — the layouts crop to 4:5, 16:9 and full-bleed, so don't
  compose tight to the edges.
- **Don't over-tidy.** Swarf, oil, worn tools and a wheelbarrow are the proof.
  A staged-clean workshop looks like stock photography, which is the one thing
  this site cannot afford to look like.
- **Natural light where possible**; the roller door open is the best light in
  most workshops. Avoid mixed fluorescent/daylight white balance if you can.

## Permissions to sort at the same time

- Written OK from Neil to use the Instagram photographs already on the site.
- `img/i8.jpg` has **a member of the public's face in it** — either get their
  permission, crop it out, or replace the frame at the shoot.
- If any customer's registration plate is identifiable, confirm they're happy
  or blur it.

## What I'll do with them

Once the files land: crop to the placements, generate 1×/2× WebP and AVIF
renditions with fallbacks, add explicit width/height to kill layout shift, and
re-cut the hero video from real footage of a car leaving the workshop if any
gets shot — which would replace the stock Icelandic drone clip currently in the
hero with something that is actually this business.
