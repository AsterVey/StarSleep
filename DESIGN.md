---
name: 星眠 · Star Sleep
description: Quiet night-work deadline console with Chinese controls, icy blue geometry and orbital timekeeping.
colors:
  primary: "#ade3fa"
  primary-hover: "#d0f0fc"
  primary-ink: "#0b2333"
  night: "#070e1b"
  modal-surface: "#0e1b2c"
  line: "#293e52"
  text: "#e0edf7"
  muted: "#a0b6ca"
  secondary-surface: "#142638"
  secondary-text: "#cfe1ef"
  input-surface: "#0b1726"
  danger-surface: "#743b4b"
  danger-text: "#ffe9ee"
  warning: "#edc590"
typography:
  display:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "52px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "1px"
  headline:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "24px"
    fontWeight: 500
    letterSpacing: ".5px"
  title:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "21px"
    fontWeight: 500
  time:
    fontFamily: "Rajdhani, sans-serif"
    fontSize: "29px"
    lineHeight: 1.3
  body:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    lineHeight: 1.8
  label:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
  auxiliary:
    fontFamily: "'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
rounded:
  badge: "4px"
  compact: "6px"
  control: "7px"
  inset: "8px"
  next-event: "9px"
  panel: "14px"
spacing:
  control-gap: "7px"
  small: "12px"
  form-grid: "16px"
  section: "24px"
  panel: "25px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.secondary-text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  input:
    backgroundColor: "{colors.input-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "9px 11px"
  modal:
    backgroundColor: "{colors.modal-surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
    width: "530px"
---

# Design System: 星眠

## Overview

**Creative North Star: "冷蓝色星舰控制台"**

A precise, quiet deadline console for night work. The inherited black-blue field, measured ice-blue geometry and Rajdhani numerals make time legible without making the application feel urgent by default. Chinese interface text remains direct and practical.

This is the implemented v1.2 system, reconciled with `src/style.css`, `src/main.tsx` and `src/components/*`. The existing code-led concentric instrument remains the visual authority; this refresh does not establish a new visual world. The first view leads with the next shutdown, then the real plans that determine it. The smaller instrument gives more room to searchable schedule management.

**Key Characteristics:**

- Black-blue tonal surfaces, fine cold boundaries and restrained ice-blue actions.
- Concentric timekeeping and tabular numerals beside a larger working list.
- Chinese-first labels, explicit execution times and persistent operational context.
- Responsive stacking and internal scrolling protect controls and footer visibility.

## Colors

A nearly monochromatic night palette uses pale ice for action and time, amber for pause and caution, and rose for destructive decisions and faults. The running status dot is ice-blue; pausing changes it to amber.

### Primary

- **Ice light** (`primary`): primary buttons, selected weekdays and quick presets, focus outlines, checkboxes and range controls.
- **Bright ice** (`primary-hover`): filled primary hover.
- **Deep ink** (`primary-ink`): text inside pale primary controls.

### Secondary

- **Muted amber** (`warning`): paused status and caution. Warning paragraphs use a related warm tint on a muted warm inset.
- **Rose surface and pale rose** (`danger-surface`, `danger-text`): destructive confirmation. Fault notices and invalid fields use related rose values.
- Alarm kind icons carry a subdued lavender-blue tint; they do not introduce a second general-purpose action accent.

### Neutral

- **Night** (`night`): application backdrop beneath a faint radial blue field.
- **Raised navy** (`modal-surface`): dialog surface.
- **Instrument boundary** (`line`): shared workspace, filter and settings dividers.
- **Cold white and slate** (`text`, `muted`): main content and supporting text.
- **Secondary navy and pale slate** (`secondary-surface`, `secondary-text`): secondary actions.
- **Inset night** (`input-surface`): editable fields.

**The Readable State Rule.** Stopping a plan does not dim its entire row. Keep its name, time and available actions readable; communicate state with the switch and text badge, and dim only the kind icon. Temporarily unavailable buttons retain their separate disabled treatment.

## Typography

**Display Font:** Bundled Rajdhani, with sans-serif fallback.
**Body Font:** Microsoft YaHei UI, Microsoft YaHei, sans-serif.

Rajdhani gives numbers and the small English wordmark a narrow instrument voice. Chinese text uses the Windows UI face as functional body type. Hierarchy comes from size, spacing and restrained weight, with no heavy display treatment.

### Hierarchy

- **Display:** the orbital countdown uses the frontmatter display role with tabular figures. Wide windows at heights up to 900px use 44px; at heights up to 760px they use 35px. Stacked windows use 30px, then 24px at widths up to 700px; the short stacked mode overrides both to 23px. Reminder countdowns use 58px, or 48px at widths up to 700px.
- **Headline:** the console heading uses the headline role, reducing to 21px in short wide windows and 20px in stacked windows; the narrow variant is 18px. The short stacked mode hides this heading.
- **Title:** list and ordinary dialog titles use the title role; stacked list headings use 19px. Reminder headings are 23px.
- **Time:** schedule rows use the time role with tabular figures. Next-execution strips use 18px, or 17px in stacked mode; editor previews use 20px.
- **Body:** general text, substantive muted copy, settings explanations and warning paragraphs use 13px. Paragraphs normally use 1.8 line height; substantive muted paragraphs use 1.85. Plan names use 14px with 1.6 line height.
- **Label and auxiliary:** 12px supports captions, filters and compact presets; 11px supports recurrence, next-execution metadata, status badges, row actions, lifecycle notes and secondary chrome. These are existing dense UI roles, not a new body-copy default.

**The Numbers and Language Rule.** Use Rajdhani for time and numeric emphasis; preserve the Chinese UI stack for explanations, field labels and actions. Keep substantive instructions at the body size rather than inheriting auxiliary metadata sizing.

## Layout

The application is a viewport-height flex column. Title bar, toolbar, optional fault notice and footer surround a flexible workspace with zero minimum flex height. Body scrolling is disabled. The toolbar holds pause/resume, quick timing and settings; a safe-test badge remains visible at every responsive width when safe mode is active.

At standard desktop widths the workspace has side margins of 27px and a two-column grid: `minmax(320px, .72fr) minmax(510px, 1.28fr)`. The left instrument is smaller than the right plan list. At widths up to 1150px the grid becomes `minmax(310px, .7fr) minmax(480px, 1.3fr)`, panel side padding becomes 20px, and the wall clock and secondary running explanation disappear. At widths of at least 1500px, the workspace caps at 1460px with 40px minimum side space and uses `minmax(380px, .7fr) minmax(600px, 1.3fr)`.

At widths up to 1060px, the instrument stacks above the list inside one framed workspace. The top instrument uses a 155px orbit beside its next-execution strip and four presets; templates sit below. Side margins become 21px. At widths up to 700px, margins become 14px, the orbit is 120px, row kind icons disappear and controls wrap where defined. The settings categories remain a compact horizontal group.

At widths up to 1060px **and** heights up to 760px, the final compact rules take precedence: a 100px orbit sits beside the next-execution strip and presets, the redundant heading is hidden, and the workspace and plans panel clip outer overflow while the list scrolls internally. The 900×650 minimum window uses this mode. The footer and plan lifecycle note remain outside the scrolling list.

The standard orbit is at most 310px, increasing to 350px on large screens. Height rules override these widths: at widths above 1060px it is 240px at heights up to 900px, then 185px at heights up to 760px. Preserve this cascade when adjusting the layout; earlier declarations are not the final computed values.

Spacing is compact: small controls use gaps around 7–12px; forms use a 16px two-column gap; major dialog actions use 24px separation. The editor pairs action/repetition and time/date fields. Dialogs are centered at 530px, or 640px for settings and records, constrained to the viewport minus 36px in each axis, with internal overflow scrolling. Dialog padding reduces from 25px to 20px at narrow widths.

**The Visible Lifecycle Rule.** Keep the tray explanation, execution limitations and footer actions visible at supported sizes. Shrink the orbit and scroll the plan list before pushing operational context out of view.

## Elevation & Depth

Depth is tonal rather than card-heavy: a faint radial field, translucent workspace fill, inset controls and fine boundaries. Ordinary buttons and schedule rows have no resting shadows. The orbit uses fine strokes and opacity, not a large glow. Dialogs and toasts receive the only substantial shadows; the dialog backdrop darkens the interface without blur.

### Shadow Vocabulary

- **Dialog:** `0 25px 70px #0008` separates a blocking decision from the console.
- **Toast:** `0 10px 30px #0007` raises transient feedback above content.

**The Quiet Surface Rule.** Keep ordinary working surfaces tonal and ruled; reserve large shadows for dialogs and transient feedback.

The orbital satellite rotates over 80 seconds and an armed arc breathes over six seconds. Pointer ripples fade over 850ms and request frames only while waves remain. Button backgrounds transition over 160ms, presses over 120ms and switch thumbs over 180ms, using ease-out. Hidden or minimized windows and either reduced-motion setting stop decorative animation and suppress ripples. User pause stops the satellite and replaces the countdown with dashes.

## Shapes

Concentric circles, radial ticks and a partial arc are the signature geometry. The arc is decorative, not a measure of elapsed or remaining progress. Small controls use modest rounded corners; the workspace and dialogs share the larger panel radius. Switches are pills with circular thumbs. Plan rows form a continuous ruled list, rather than floating cards. The next-event strip and execution preview are softly rounded inset surfaces.

## Components

### Buttons

Primary, secondary and destructive actions share compact 38px minimum-height construction and the control radius. Primary hover brightens; secondary hover raises the navy tone. Pressing an enabled button moves it down 1px. Shared keyboard focus is a 2px ice outline offset 3px. Disabled buttons use 0.48 opacity; the noninteractive empty next-event strip deliberately retains full opacity.

Icon buttons are 38px square, transparent at rest and blue on hover. Text actions use a lighter label on hover; row actions are smaller 26px minimum-height controls. Retain accessible names for icon-only controls.

### Filters, Selectors and Status

Action filters use a thin baseline and a two-pixel ice underline for the selected button. Status and sort controls are native selects. Weekday and quick-time choices use pale filled selection. Settings uses filled selected-category buttons. All button-based selections expose `aria-pressed`; switches expose `role="switch"` and `aria-checked`. Status badges pair an explicit word with their tone.

### Plan List

Search precedes action/status filters, sort controls and selection actions. Rows contain a checkbox, kind icon, wrapping name, state badge, digital time, recurrence, next execution, edit/copy/skip/delete actions and an enable switch. Names and metadata wrap; the short next-event summary ellipsizes on wide layouts and is hidden when stacked.

The list renders 50 rows per page, with pagination when needed. Select-all applies to the current filtered result, including its other pages. Batch controls replace the cleanup action when rows are selected. Empty and no-match states provide distinct explanations and actions; production data is never substituted with invented plans.

### Inputs and Editor

Fields use inset navy, a thin blue border, the control radius and visible labels. Regular editor fields are 42px tall. Invalid fields use rose borders and adjacent 12px error text. The editor autofocuses the name field, displays the effective next time and places the shutdown warning beside the final decision. Copies open disabled; templates and quick presets lead to confirmation rather than immediate execution.

### Dialogs and Settings

Native modal dialogs constrain focus while open and restore the previous connected element on close. Ordinary panels provide a close button and Esc dismissal; the active reminder requires an explicit action. Unsaved editor changes open a discard confirmation. Ctrl+N opens a new plan and Ctrl+F focuses search when no dialog is open.

Settings has four categories: 声音与提醒, 外观, 数据管理 and 关于. Use the established divider rhythm and 13px explanatory text. Data import has a preview with accepted, duplicate and expired counts; records provide query/date/error filters and export of the current result.

### Orbital Console and Reminder

The console shows the nearest shutdown with an explicit calendar time, compact presets and expandable templates. Empty, paused and fault states show dashes instead of a misleading countdown. Pause and storage-fault protection retain distinct wording.

The reminder groups the earliest matching shutdown deadline, bounds its plan-name list, shows the exact execution time and offers cancel or 10/30/60-minute snooze. Alarm actions and automatic-stop time are separately visible. Demo copy explicitly says it will not shut down the computer. A global pause action appears for real reminders.

### Feedback and Assets

Toasts use the browser top layer and `role="status"`. Fault notices use `role="alert"`. Lucide supplies interface SVG icons; the instrument is authored SVG. Bundled Rajdhani supplies the numeric voice. Pointer ripples are decorative canvas; electronic sounds are generated locally and controlled separately from reminder volume.

## Do's and Don'ts

### Do:

- **Do** preserve the black-blue field, icy concentric instrument and Chinese-first numeric hierarchy.
- **Do** give plan management more space than the orbit and stack the instrument in narrow windows.
- **Do** keep substantive explanations at 13px and reserve 11–12px for established auxiliary roles.
- **Do** keep the safe-test badge, lifecycle note and footer available at supported window sizes.
- **Do** pair color with state text, semantic selection and visible keyboard focus.
- **Do** stop decorative activity when hidden or reduced motion is requested.

### Don't:

- **Don't** dim an entire disabled plan row or its available actions.
- **Don't** fabricate schedules, countdowns or savings claims in production states.
- **Don't** interpret the orbital arc as quantitative progress.
- **Don't** promote every list row to a shadowed card or add glow to ordinary controls.
- **Don't** replace the approved visual world with an unrelated concept seed.

## Reviewed Captures

These are the authoritative v1.2 review captures from the actual Electron application. Dimensions below are logical DIP; device scaling changes physical image dimensions. Every populated capture uses isolated synthetic schedules and the visible safe-test indicator.

| Capture | Window / scale |
| --- | --- |
| `artifacts/v12/11-console.png` | 1240×820, 100% |
| `artifacts/v12/12-minimum.png` | 900×650, 100% |
| `artifacts/v12/scale-1.25.png` | 1000×700, 125% |
| `artifacts/v12/scale-1.5.png` | 1000×700, 150% |
| `artifacts/v12/scale-2.png` | 1000×700, 200% |
| `artifacts/v12/02-editor.png` | 1240×820, 100% |
| `artifacts/v12/05-settings.png` | 1240×820, 100% |
| `artifacts/v12/09-reminder.png` | 1240×820, 100% |

Distribution copies are in `docs/images/v1.2.0/` as `console.png`, `minimum.png`, `scale-125.png`, `scale-150.png`, `scale-200.png`, `editor.png`, `settings.png` and `reminder.png`. The development-only `artifacts/` directory is not included in the source archive.
