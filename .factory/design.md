# Import Transform Ledger — visual thesis

## Direction: surreal editorial customs desk

The product turns an opaque cleanup job into a reviewable passage from “source”
to “ready.” Its visual world is a sunlit, impossible records office: paper
columns travel across a lapis table, pass through vermilion measuring gates,
and arrive as orderly ledger slips. The scene explains the job without showing
a fake UI. Working screens borrow the same vocabulary—ruled paper, registration
marks, clipped corners, stamps, and numbered stages—but decoration recedes once
data is present.

This is intentionally a **single daylight mode**. CSV review depends on stable
semantic color and long table-reading sessions; an explicitly painted warm
paper environment keeps warnings and rejects consistent instead of offering a
token dark treatment that changes their meaning.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F3EBDD` | App background; warm archival stock |
| Sheet | `#FFFDF8` | Working surfaces and table fields |
| Ink | `#172822` | Primary text; near-black green, 13.9:1 on paper |
| Quiet ink | `#52635B` | Secondary text; 5.7:1 on paper |
| Lapis | `#164E63` | Primary actions and focus; 7.6:1 with white |
| Vermilion | `#A93628` | Registration marks and editorial emphasis; 5.5:1 on paper |
| Mustard | `#D8A928` | Selection fields and editorial highlights |
| Moss | `#2E6B4F` | Valid/ready status |
| Reject | `#9F2F32` | Errors and rejected rows |
| Rule | `#B9B09F` | Borders and ledger rules |

Never use color alone: every state also receives an icon, label, or row reason.

## Typography

- **Display/editorial:** Georgia, `Times New Roman`, serif. No download, crisp
  contrast, slightly uncanny newspaper authority for the one h1 and section
  titles.
- **Interface/data:** Inter-compatible system sans stack (`ui-sans-serif`,
  `system-ui`, `Segoe UI`, sans-serif). Tables use tabular figures. No runtime
  font request and no font payload.
- Scale: 14px annotation, 16px body, 20px subhead, 28px section, clamp(40–64px)
  h1. Body line-height 1.55; prose measure 68ch.

## Spacing and layout

An 8px base rhythm with 4px for optical corrections. The desktop shell is a
12-column field; the active workbench uses a 280px stage rail plus a fluid data
plane. At 760px, the rail becomes a horizontal scrollable stage strip and all
mapping pairs stack. At 390px, optional hero notes disappear, every primary
action becomes full-width, and tables scroll inside labelled regions rather
than compressing below legibility. All targets are at least 44px.

## Interaction grammar

- The product is a five-stamp journey: **Load → Map → Rules → Review → Export**.
  A numbered rail always exposes current state and what is ready next.
- Selected elements receive a mustard under-rule and a lapis registration dot,
  echoing printer crop marks.
- New data “lands” with a 180ms opacity/translate transition from its source.
  Buttons depress 1px. The export receipt stamps in once; nothing loops.
- `prefers-reduced-motion: reduce` removes transforms, smooth scrolling, and
  transitions; state remains obvious through borders, labels, and contrast.
- Feedback is immediate in an `aria-live` status ribbon. Destructive resets use
  a named confirmation and saved recipes can be deleted only after confirmation.

## Original asset plan and prompt sheet

One generated hero illustration is used on the welcome/empty workspace and in
the installed-app splash language. Hand-authored SVG app icons use the same
portal-and-sheet motif. No stock imagery or icon library is used.

**Prompt (hero-customs-desk):**

> Use case: stylized-concept. Asset type: responsive landing-page hero
> illustration for a local CSV transformation utility. Scene/backdrop: a
> surreal editorial records landscape on warm archival paper. Subject: neat
> blank paper columns travel from a loose stack, across a deep lapis drafting
> table, through three vermilion and mustard measuring gates, and arrive as one
> aligned ledger sheet with small green approval marks. Style/medium: tactile
> cut-paper editorial collage with subtle screenprint grain, sophisticated
> magazine illustration, geometric perspective. Composition: wide 3:2 scene,
> central visual path, generous quiet paper around edges, no interface mockup.
> Lighting/mood: long quiet morning shadows, precise, optimistic, private
> workshop. Palette: warm parchment, deep blue-green ink, lapis, vermilion,
> mustard, restrained moss. Materials: fibrous paper, matte ink, brass ruler.
> Constraints: abstract data only, no people, no brands, no readable data, no
> text, no watermark, no logos. Avoid: generic SaaS gradients, glossy 3D,
> neon, cyberpunk, photoreal computer screens, illegible pseudo-text, coins,
> locks, clouds.

Generation provenance: original image generated for this product with the
factory Azure OpenAI image deployment (`factory-image`) on 2026-08-28 using the
prompt above. The selected PNG source and prompt sidecar live in `assets/src/`;
the shipped WebP is optimized to no more than 300 KB. Generated imagery is
disclosed in the footer.
