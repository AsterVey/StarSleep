---
name: 星眠 · Star Sleep
description: Chinese Windows shutdown and alarm console with icy blue orbital timekeeping.
colors:
  primary: "#a5def8"
  primary-hover: "#c7efff"
  focus: "#99dfff"
  night: "#070e1b"
  modal-surface: "#0e1b2c"
  line: "#20334a"
  text: "#dce8f5"
  muted: "#91a7bf"
  secondary-surface: "#14253a"
  secondary-text: "#bcd2e5"
  danger-surface: "#763b49"
  danger-text: "#ffe1e7"
  warning: "#dbbf9d"
typography:
  display:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "66px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "1px"
  headline:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "23px"
    fontWeight: 500
    letterSpacing: "1px"
  time:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    lineHeight: 1.8
  label:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
rounded:
  control: "7px"
  compact: "6px"
  inset: "9px"
  modal: "15px"
  workspace: "16px"
spacing:
  control-gap: "7px"
  small: "12px"
  form-grid: "16px"
  section: "24px"
  modal: "26px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#102437"
    rounded: "{rounded.control}"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  input:
    backgroundColor: "#081322"
    textColor: "#deeffd"
    rounded: "{rounded.control}"
    height: "43px"
    padding: "0 13px"
  modal:
    backgroundColor: "{colors.modal-surface}"
    rounded: "{rounded.modal}"
    padding: "{spacing.modal}"
    width: "510px"
---

# Design System: 星眠

## Overview

Release refinement (v1.0.0): schedule rows expose their effective next date and time;
the nearest shutdown uses an ice-blue status dot and text. Row actions use 34px
targets. Settings includes the version, first author, short origin story and two
fixed GitHub destinations. Preserve the existing orbital identity and reduced-motion behavior.

**Creative North Star: "冷蓝色星舰控制台"**

A quiet black-blue instrument for scheduling a computer's rest. Chinese copy remains direct and human; icy blue light, concentric geometry and narrow digital numerals provide the starship character. The surface is HTML/React inside a Windows desktop shell.

This captures the user-approved, code-led direction; no reference comp exists. The implemented sources are `src/style.css`, then the overriding `src/fit.css`, with structure and behavior in `src/main.tsx`. Reviewed visual evidence is `artifacts/02-console.png`, `06-compact.png` and `07-minimum.png`.

**Key Characteristics:**

- Dark tonal panels, fine blue boundaries and restrained light.
- A large concentric shutdown countdown paired with a practical schedule list.
- Short electronic feedback and pointer ripples that settle when interaction stops.

## Colors

The palette is predominantly blue-black, with pale ice for action and time.

### Primary

- **Ice light** (`primary`): filled primary buttons and selected weekday controls.
- **Bright ice** (`primary-hover`): primary button hover.
- **Focus light** (`focus`): visible keyboard outlines and input caret.

### Secondary

- **Muted amber** (`warning`): unsaved-work warnings.
- **Rose warning surface and text** (`danger-surface`, `danger-text`): destructive confirmation. Alarm icons use a quieter lavender-blue tint to distinguish their kind.

### Neutral

- **Night** (`night`): the application backdrop.
- **Raised navy** (`modal-surface`): dialog surfaces.
- **Instrument boundary** (`line`): workspace frame and panel separation.
- **Cold white and slate text** (`text`, `muted`): main content and supporting copy.
- **Secondary navy and pale slate** (`secondary-surface`, `secondary-text`): secondary actions.

**The Readable State Rule.** A disabled schedule retains full text and action contrast. Only its kind icon is dimmed; the switch communicates whether it is enabled.

## Typography

Rajdhani supplies bundled digital numerals and the small English wordmark. Microsoft YaHei UI, with Microsoft YaHei and sans-serif fallbacks, carries Chinese text. The hierarchy comes from scale and spacing rather than heavy weight.

- Display time uses tabular figures; its desktop size reduces to 51px at 681–760px viewport height and 43px at 680px or below. At narrow widths above those height bands it is 58px.
- Schedule times use the `time` role; recurrence labels sit beside them in smaller Chinese type.
- The main heading uses `headline`; schedule headings are 19px and dialog headings 20px.
- Supporting copy is generally 10–12px. The smallest 8–9px text is reserved for compact kind badges, units and schedule metadata.

## Layout

The main instrument remains two columns across supported desktop sizes. At standard width, its side margins are 34px and the columns use a 1:1.02 ratio. At 1050px and below, margins become 22px and the columns equalize. The title caption disappears at this width.

The workspace fits the viewport beneath the title bar and toolbar. Its height is normally `calc(100dvh - 205px)`, changing to `calc(100dvh - 161px)` at 760px height and below. At widths of at least 1400px with height above 760px, the frame is capped at 1300px and uses a 223px vertical allowance. The short-height frame has a 480px minimum.

The orbit reduces from a standard 380px maximum to 310px and then 260px in the two short-height bands. The schedule list scrolls inside its column; the lifecycle note, demo action and application footer stay visible. Normal 1240×820, compact 1000×700 and minimum 900×650 desktop windows are the maintained review sizes; screenshot pixel dimensions may reflect display scaling.

Dialogs are centered, with viewport-constrained width and height and internal scrolling. The editor places time and repeat controls side by side.

**The Visible Lifecycle Rule.** Keep the tray behavior and runtime limitation copy visible at every supported window size; shrink the instrument and scroll the list before displacing the footer.

## Elevation & Depth

Depth is mainly tonal: a faint radial field, sparse stars, translucent panel fills and thin borders. The orbital arc supplies concentrated light without flooding the background. Small button shadows separate actions; dialogs and toasts have stronger shadows and the dialog backdrop uses a light blur. Exact shadows and motion timings live in `.impeccable/design.json`.

The orbital marker rotates over 70 seconds; an armed arc breathes over five seconds. Pointer ripples expand and fade over one second, and stop requesting frames when no wave remains. Hidden or minimized windows, the system reduced-motion preference and the app's reduced-motion setting pause decorative animation and suppress ripples. Synthesized action sounds and alarm volume have separate controls.

## Shapes

The signature geometry is concentric circles with radial ticks and a partial luminous arc. Controls use modest curved corners; the outer workspace and dialogs are more softly framed. Switches and status dots are circular or pill-shaped. List rows are separated by fine horizontal rules rather than individual floating cards.

## Components

- **Primary, secondary and destructive buttons:** compact filled controls, at least 37px tall, with 12px medium-weight labels. Primary hover brightens; secondary hover raises the navy tone. A press moves down 1px and scales to 0.98. Shared keyboard focus is a 2px ice outline offset 4px.
- **Icon and text actions:** transparent by default. Icon actions gain a blue surface on hover; text actions brighten. Preserve accessible names for icon-only controls.
- **Filter navigation:** a horizontal set of buttons with a thin baseline and a brighter two-pixel underline on the selected item. Selection is also exposed through `aria-pressed`.
- **Kind and weekday selectors:** kind choices are two bordered panels; the selected one has a brighter border, raised blue fill and check mark. Weekdays use compact square buttons with an ice fill when selected. Both expose `aria-pressed`.
- **Schedule rows:** kind icon, name and small kind badge, digital time, recurrence and next-execution text, then switch and edit/delete actions. Switches expose `role="switch"` and `aria-checked`. Long names and the next-event summary ellipsize within their allotted area.
- **Fields:** dark inset fill, thin blue border, visible label and shared keyboard focus. Native date, time and select controls remain legible within this treatment.
- **Dialogs:** framed navy panels with explicit close actions. Ordinary dialogs support keyboard dismissal; the imminent reminder requires an explicit cancel, stop or snooze action. Warning copy uses amber adjacent to the relevant action.
- **Countdown:** authored SVG geometry surrounds tabular time and text status. The decorative arc is not a quantitative progress meter. Empty state displays dashes and an honest unset status.
- **Inset strips and toast:** the next-event and safe-demo strips use quieter filled navy containers; the toast floats above content and announces status.

The original application icon is geometric artwork from `scripts/icon.ps1`; instrument geometry is authored SVG, UI icons come from Lucide, and Rajdhani ships with its font license. Electronic sounds are generated locally with Web Audio.

## Do's and Don'ts

### Do:

- **Do** preserve the icy concentric instrument, Chinese-first copy and narrow digital time hierarchy.
- **Do** keep lifecycle and shutdown warnings readable at normal, compact and minimum window sizes.
- **Do** expose selection and switch state semantically as well as visually.
- **Do** stop decorative activity when hidden or reduced motion is requested.

### Don't:

- **Don't** dim an entire disabled schedule row or its edit and delete actions.
- **Don't** use fabricated schedules, countdowns or savings claims in production states.
- **Don't** treat the decorative arc as elapsed or remaining progress.
- **Don't** replace the approved visual world with an unrelated concept seed.
