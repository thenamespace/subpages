# Design schema

The look is an arcade cabinet: dark warm ink, amber glow, square corners, hard
offset shadows. It comes out of the artwork rather than a mood board — every
colour below was sampled from the pixel lion and converted to OKLCH so the
ramps stay perceptually even.

## Where the colour came from

Quantising the PFP to 16 colours gives the real palette. These are the pixels
that actually appear in the art, not an interpretation of them:

| Sampled | Hex | Share | Becomes |
| --- | --- | --- | --- |
| Bright mane | `#F69B4C` | 7.4% | `--color-amber-400`, the primary |
| Mid mane | `#C27839` | 7.5% | `--color-amber-600`, pressed state |
| Deep mane | `#A36E42` | 6.1% | interpolated into the ramp |
| Mane shadow | `#3E2419` | 3.9% | `--color-amber-950`, the page glow |
| Cap grey | `#A39D9D` | 7.4% | neutral anchor |
| Warm grey | `#7B6250` | 4.5% | why the neutrals are warm, not blue |
| Outline | `#0E0405` | 7.5% | `--color-ink-950`, the canvas |

The cap's rainbow panel supplies the accents, one job each so none of them
competes with amber: jade `#4B9562` for success, rose `#D9878B` for errors,
iris `#8B76AE` for focus rings, bone `#FCF9AA` held in reserve.

Those hues matter more than they look. The mane sits at hue 58°, so the
neutral ramp is built at hue 50° with a trace of chroma — warm greys that
agree with the brand instead of the cool greys a default palette would give,
which fight an orange every time.

## Ramps

Two ramps, each hue-locked so the light and dark ends don't drift into
different colours:

- **ink**, hue 50, L from 0.145 to 0.940. Surfaces and text.
- **amber**, hue 58, L from 0.291 to 0.925. The only brand colour.

Dark-mode layering runs the usual way: the page is the darkest surface and
each layer closer to the viewer gets lighter. `canvas` → `panel` → `raised`.

Contrast was checked against the rule that text on a ground at L ≤ 0.25 needs
L ≥ 0.75. Body text is `ink-200` at L 0.866 on `ink-950` at L 0.145. Muted
text bottoms out at `ink-300`, L 0.760, which still clears it. Disabled text
uses its own token rather than an opacity, so its contrast doesn't change
depending on what happens to sit behind it.

Components never reference a ramp step directly. They use the semantic
aliases — `--color-text`, `--color-edge`, `--color-brand` — so a palette
change is one file.

## Type

**Press Start 2P** for display, **JetBrains Mono** for everything else.

Press Start 2P is the right arcade face and the wrong body face; below about
16px it stops being readable, and this page shows hex addresses and error
messages. So it carries headings, labels and buttons only, always uppercase,
always with tracking loosened to 0.06em — default tracking on all-caps pixel
type looks cramped.

JetBrains Mono takes the rest, with `font-variant-numeric: tabular-nums` set
on `body` so stacked addresses line up digit to digit.

Body copy is capped at 46–52ch. Inputs are 16px minimum, which is not a
stylistic choice: anything smaller and iOS Safari zooms the viewport when the
field takes focus.

## Surfaces

Square corners everywhere — `border-radius: 0` is set globally, and the
`.notch-2` / `.notch-4` utilities give a stepped corner where a radius would
normally go.

Borders are solid, not alpha-white. On a dark surface an `rgba(255,255,255,…)`
border glows; a solid dark grey sits quietly where it belongs.

Shadows are hard offsets with zero blur (`4px 4px 0`). This is a deliberate
break from the usual layered-shadow advice: blurred shadows under pixel-
rendered art look like a rendering mistake rather than depth.

## Motion

- Presses are 70ms. An arcade button that eases into a press feels broken.
- The button moves into its own shadow: `translate(3px, 3px)` while the
  shadow shrinks to `1px 1px`.
- Enters use `cubic-bezier(0.32, 0.72, 0, 1)`.
- The success tick animates on discrete keyframes held at `linear`, not a
  smooth ease — a sprite that scales continuously goes soft between whole
  pixels.
- The name plate's stamp and cursor use stepped keyframes too.
- `prefers-reduced-motion` collapses every CSS duration to 0.01ms, and
  `MotionConfig reducedMotion="user"` (in `providers.tsx`) drops the
  transform half of every motion/react animation, leaving opacity fades.

## Components

| Component | Notes |
| --- | --- |
| `PixelButton` | Three variants, one primary per view. Disabled uses a token, not opacity. Loading shows a stepped square, never a spinning circle. |
| `PixelPanel` | Solid border, hard shadow, scanline overlay under 4% alpha. |
| `LabelInput` | Suffix `.evmaverick.eth` rendered outside the field so it can't be deleted. Spaces are stripped on type and paste. Below it, a fixed-height name plate spells out the full name, shows the naming rules until something is typed, and stamps the verdict (WAIT, FREE, TAKEN, SHORT, NOPE, RETRY). "Too short" waits for a pause or blur; the loader only shows after 500ms. |
| `QuotaPips` | One pip per NFT, filled = claimed. Sits opposite the field's label rather than on its own row. Decorative; the count beside it is the accessible label. |
| `gateNotice` | Every blocked state in one place. A plain function, not a component — the caller needs to know whether anything is blocking. |
| `PixelDialog` | The one modal in the flow, used for record editing. Claim errors and the pending note render inside it, never behind it. |
| `SuccessCard` | Pixel tick rather than the lion, which already sits in the hero above. Buttons stack full width, primary on top; with no claims left, Manage records becomes the primary. |
| `WalletButton` (header) | A quiet bordered button, not RainbowKit's amber default. The card owns the one primary action on the page. Wrong network reads in rose. |
| `HeaderNav` (header) | Each page links to the other in a quiet 44px text link, never to itself. Amber stays reserved for the card. |

The record editor comes from `@thenamespace/ens-components`, themed onto our
palette through `.ens-scope` (see `src/app/ens-theme.css`) and shown in
`PixelDialog`. Everything else is hand-built on plain elements in the pixel
aesthetic. There is no tooltip or toast anywhere in the flow.

## Sound

One sound: the roar (`public/roar.mp3`), played only after the claim
transaction confirms. Nothing plays on load, click or record edits, and the
header mute toggle is respected even if flipped mid-transaction.

## Accessibility

One focus treatment, applied through `:focus-visible` and never removed: a
2px iris outline at 2px offset. Real `<button>` elements throughout. The
availability status is a visually hidden `aria-live="polite"` status; mint errors are
`role="alert"`. Errors carry text, not just colour. The decorative gradient
is `pointer-events: none` so a full-bleed layer can't swallow clicks.

## Reviewing it

Because the page fails closed and `evmaverick.eth` has no listing yet, a real
wallet only ever reaches the blocked states. `?preview=<state>` swaps in
fixtures for each screen — `ready`, `ready-multi`, `spent`, `no-token`,
`error`, `not-listed`, `checking`, `minting`, `success`. On in development;
in production it needs `NEXT_PUBLIC_ENABLE_PREVIEW=true`.
