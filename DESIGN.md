---
name: 星枢 · StarNexus
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

This is the implemented v1.3 system, reconciled with `src/style.css`, `src/experience.css`, `src/main.tsx` and `src/components/*`. The existing code-led concentric instrument remains the visual authority. The full console manages real plans, the seven-day view previews upcoming occurrences, and the mini console keeps the next deadline visible. All three surfaces preserve the quiet Chinese-first hierarchy.

The v1.4 original-client theme panel extends this visual system, as implemented in `src/components/Integrations.tsx` and `src/integrations.css`. 星眠 remains an import and configuration assistant: users want to change Codex or Claude's original interface, while this panel retains the cold-blue console. Client compatibility and verification limits are recorded in `docs/CLIENT-THEMES.md`.

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

In the original-client theme panel, client detection explanations, theme instructions and the configuration/recovery caveat use 13px body text with 1.8 line height; the loader guide uses 13px with 1.9 line height. Theme format metadata, short readiness labels, color codes and the palette caption use 11px auxiliary text. The scoped `.theme-layout` override keeps substantive client status and `.integration-small` paragraphs at 13px.

## Layout

The full console retains the responsive rules below. Mini mode reuses the same window at 320×168 DIP: a draggable title bar, 34px Rajdhani countdown, single ellipsized plan name and exact execution time. Its four controls are pin, hide to tray, return to full and pause/resume. Open dialogs prevent entering mini; reminders restore the full view. Mini is an explicit window mode, not a mobile breakpoint.

The plan heading adds a filled list/seven-day selector. The agenda uses seven equal date columns above an independently scrolling ruled occurrence list. Date numbers use Rajdhani at 25px, reducing to 23px in stacked windows. Personal templates use the existing wide dialog with a two-column built-in group and a scrolling personal list; template editors retain the ordinary field grid and protected close behavior.

The application is a viewport-height flex column. Title bar, toolbar, optional fault notice and footer surround a flexible workspace with zero minimum flex height. Body scrolling is disabled. The toolbar holds pause/resume, quick timing and settings; a safe-test badge remains visible at every responsive width when safe mode is active.

At standard desktop widths the workspace has side margins of 27px and a two-column grid: `minmax(320px, .72fr) minmax(510px, 1.28fr)`. The left instrument is smaller than the right plan list. At widths up to 1150px the grid becomes `minmax(310px, .7fr) minmax(480px, 1.3fr)`, panel side padding becomes 20px, and the wall clock and secondary running explanation disappear. At widths of at least 1500px, the workspace caps at 1460px with 40px minimum side space and uses `minmax(380px, .7fr) minmax(600px, 1.3fr)`.

At widths up to 1060px, the instrument stacks above the list inside one framed workspace. The top instrument uses a 155px orbit beside its next-execution strip and four presets; templates sit below. Side margins become 21px. At widths up to 700px, margins become 14px, the orbit is 120px, row kind icons disappear and controls wrap where defined. The settings categories remain a compact horizontal group.

At widths up to 1060px **and** heights up to 760px, the final compact rules take precedence: a 100px orbit sits beside the next-execution strip and presets, the redundant heading is hidden, and the workspace and plans panel clip outer overflow while the list scrolls internally. The 900×650 minimum window uses this mode. The footer and plan lifecycle note remain outside the scrolling list.

At widths up to 1060px **and** heights up to 500px, the v1.5 daily-tools override takes precedence over the internal-list rule above: the workspace becomes the single vertical scrolling surface, and the plan and agenda lists expand naturally within it. This prevents a collapsed plan list in short or zoomed viewports. Footer actions wrap outside this workspace; at widths up to 560px the secondary footer sentence is hidden while actions remain available.

The standard orbit is at most 310px, increasing to 350px on large screens. Height rules override these widths: at widths above 1060px it is 240px at heights up to 900px, then 185px at heights up to 760px. Preserve this cascade when adjusting the layout; earlier declarations are not the final computed values.

Spacing is compact: small controls use gaps around 7–12px; forms use a 16px two-column gap; major dialog actions use 24px separation. The editor pairs action/repetition and time/date fields. Dialogs are centered at 530px, or 640px for settings and records, constrained to the viewport minus 36px in each axis, with internal overflow scrolling. Dialog padding reduces from 25px to 20px at narrow widths.

**The Visible Lifecycle Rule.** Keep the tray explanation, execution limitations and footer actions visible at supported sizes. Shrink the orbit and scroll the plan list before pushing operational context out of view.

The original-client theme panel uses one framed workspace with internally scrolling content: a smaller theme library beside a larger client-status and theme-detail area. Its grid is `minmax(235px, .72fr) minmax(350px, 1.28fr)`, changing at 1060px to `minmax(225px, .78fr) minmax(300px, 1.22fr)` with 18px section padding. At 720px it stacks, replacing the library's right divider with a bottom divider. Action groups wrap; detection precedes the selected theme, and restore actions and the loader guide follow its apply/export controls.

The v1.6.0 Agent toolbox uses a framed workspace with three persistent destination tabs above an internally scrolling body. Usage summaries lead into daily bars and a two-column model/source section; resources pair a ruled selection list with a larger detail area. At widths up to 720px these detail grids stack, the resource list gets its own bounded scroll region, and summary metrics become two columns beneath the total. Compact-height rules reduce heading and tab spacing while keeping return navigation, pause, settings, the safe-test badge and footer actions reachable. Preserve scrolling to the resource actions and notes at high zoom.

## Elevation & Depth

Depth is tonal rather than card-heavy: a faint radial field, translucent workspace fill, inset controls and fine boundaries. Ordinary buttons and schedule rows have no resting shadows. The orbit uses fine strokes and opacity at rest; its explicit signal response adds a small temporary glow. Dialogs and toasts receive the only substantial shadows; the dialog backdrop darkens the interface without blur.

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

### Seven-Day Agenda, Templates and Mini

The seven-day selector and date buttons expose selection with `aria-pressed`. Each date pairs weekday, numeric date and occurrence count. Occurrence rows combine an action icon, wrapping name, exact execution time and action label; selecting one opens its source plan. Paused and fault contexts use explicit text. The preview caveat stays below its scroll region.

Personal templates inherit the existing labeled fields, primary save, secondary cancel and discard confirmation. Applying a template opens a prefilled confirmation flow; saving a template itself does not create a plan. Inline edit/delete controls sit beside each personal template's name and recurrence summary.

The instrument's state priority is fault, shutdown reminder, alarm, pause, running plan, idle. Warm amber, lavender and pale rose locally distinguish pause/warning, alarm and fault arcs alongside state text. A circular signal button responds for 850ms with a finite ring and small drop-shadow, followed by a 1500ms click cooldown. Reduced motion retains static text/button feedback. Hidden windows and mini mode stop decorative activity; the appearance setting can disable signal interaction independently.

The mini readout prioritizes the nearest shutdown, falling back to the next reminder when no shutdown exists. It shows dashes for pause, fault or no deadline and directs faults back to the full console. Keep its four controls and exact deadline visible rather than adding management controls.

### Feedback and Assets

Toasts use the browser top layer and `role="status"`. Fault notices use `role="alert"`. Lucide supplies interface SVG icons; the instrument is authored SVG. Bundled Rajdhani supplies the numeric voice. Pointer ripples are decorative canvas; electronic sounds are generated locally and controlled separately from reminder volume.

### Original-Client Theme Configuration

This operational panel follows the Operate contract: make the target, readiness and next action easy to identify within the existing cold-blue console. Under “Agent 与美化 → 原界面美化”, the ruled library shows each imported theme's name, format and small swatches; selection uses a navy fill and `aria-pressed`. The detail area begins with Codex/Claude detection, explicit readiness text and “重新检测客户端”. The palette is a color reference, not a screenshot or a simulation of either client.

Keep three outcomes distinct: **import/preview** adds a theme to the local library; **apply** writes supported appearance configuration for the named client; **visual acceptance** requires checking that client's original interface. Importing, copying or exporting never claims the theme is applied. Removing a library item does not restore the client's appearance. Feedback uses the panel's `role="status"` region.

“应用到 Codex” and “应用到 Claude” are the selected format's primary actions and are disabled while busy or when that client is not ready. Copy/export remain secondary. Separate restore actions and “Claude 美化配置指南” stay available below; Codex restore additionally depends on a recorded restore state. The guide explains loader compatibility and manual setup before re-detection. The safe-experience copy explicitly identifies isolated configuration, and saved configuration still requires checking the original client. Do not imply that readiness or a successful file write verifies rendering.

As documented on 2026-09-22, Codex native appearance apply/restore was checked on isolated configuration copies; the real client's visual result remains unverified. The detected Claude Store build has no supported loader and cannot directly apply a theme. Compatible standalone Claude installations require the separately configured loader, which 星眠 does not install automatically. Dream Skin ZIPs support inspection, storage and original-package export without automatic engine installation; DeepSeek colors support import/copy/export for their external loader. These are format-specific capabilities, not universal client skinning support.

### Theme File Hub (v1.4.3)

The theme hub preserves the existing navy-and-ice console, ruled library, native fields and internally scrolling two-column layout. “导入美化文件” accepts the supported theme formats and background images; images enter the separate background gallery. The labeled “适用客户端” select filters all themes, Codex, Claude Desktop, DeepSeek Harness or custom CSS, with a distinct no-match explanation. Selected rows retain their navy fill and `aria-pressed`; format names remain visible so a client filter does not imply that all its formats use the same loader.

Readiness now covers all three clients before the selected file's actions. DeepSeek includes an explicit data-directory selection and displays its configuration path. Keep the primary action specific to both target and format: native Codex, Claude Theme Mod and DeepSeek Dream Skin themes have readiness-gated apply buttons; Codex Dream Skin ZIP, older DSH UI Appearance colors and standalone CSS lead to the matching configuration guide. CSS remains inert library content for copying or unchanged export, with compatibility determined by its author's loader and client version. The “三端配置指南” groups setup by client, then explains standalone CSS. Restore actions remain separate; Codex and DeepSeek restoration depend on recorded restore state.

This extends the v1.4.2 wallpaper workflow: “配置到 DeepSeek” is now primary and image export is secondary. Numbered instructions lead from selecting the data directory and detecting Dream Skin to fully exiting DeepSeek, configuring the image and reopening the original client. The gallery's preview caption and feedback still distinguish collection, configuration and actual rendering. Library removal does not restore an applied appearance. Retain the existing 13px explanatory copy, wrapping action groups, narrow stacking and compact-height chrome; no design tokens change.

### Temporary Pause and Plan Notes (v1.5.0)

The temporary-pause dialog extends the existing labeled fields, filled selections and execution-preview inset. Offer 15/30/60/120-minute durations or an exact future date and time within 24 hours. Show the absolute expected resume time before confirmation and the current saved deadline when already paused; “一直暂停” remains a separate secondary action. Keep the missed-execution explanation and Agent consequences beside confirmation: missed tasks are skipped, current reminders and ringing stop, and Agent night linkage is disarmed without automatic rearming. The caution also distinguishes reopening with a saved deadline from running while exited and preserves storage-fault protection. The footer exposes “临时暂停” and, where its secondary sentence fits, the saved resume time.

Optional notes use a labeled, three-row multiline field with a 500-character limit, live count and adjacent local-storage/export explanation. Notes retain 13px body text; the counter remains an established 11px auxiliary role. Plan search includes notes. List rows preserve newlines and wrap notes into a two-line preview; reminders show the full note in a restrained navy inset beside its plan name. Keep the editor's full content available rather than treating the list preview as the stored value.

**The Pause Decision Rule.** Show an absolute resume time and skipped-task, reminder and Agent consequences before confirming temporary pause; distinguish timed resume from indefinite pause.

**The Notes Context Rule.** Keep optional notes readable as body text, show the character count and export inclusion beside editing, and reserve truncation for the two-line plan-list preview rather than the active reminder.

### Agent Toolbox (v1.6.0)

The toolbox extends the same navy-and-ice system through “用量看板”, “开源资源” and “本机 Skills”. Tabs use the existing ice underline and `aria-pressed`; fields, wrapping action groups and selected resource rows reuse inset navy and explicit selection. Keep substantive scope and instructions at 13px, metadata at the established auxiliary size, and usage totals in tabular Rajdhani. The implementation is `src/components/Toolbox.tsx`, `src/toolbox.css` and the toolbox route in `src/main.tsx`.

The usage surface puts today/7-day/30-day range, source filter, manual refresh and summary export before totals and daily bars. Keep the unmodified ccusage 20.0.24 engine attribution, update time, model distribution and explicit source status available below. Explain the readable-log scope beside the totals, including cache accounting and unsupported sources. Automatic refresh runs every five minutes while the page is visible; hiding it stops new scans. Resource search, category/client filters and favorites lead to a selected detail with author, license, use case, instructions, direct author-repository action and personal notes. Local Skills is a searchable read-only file inventory with directory reveal and an explicit scan boundary.

**The Toolbox Evidence Rule.** Keep readable-log totals distinct from account quotas or subscription bills, resource favorites distinct from installation, and local skill-file presence distinct from client enablement; show scope and source state beside the relevant action or result.

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

### Reviewed Captures

The v1.6.0 toolbox finish review disposition is **ship**, with no material fixes outstanding across 16 accepted captures in `artifacts/v16/`. This document pass inspected `desktop-usage.png`, `desktop-resources.png`, `zoom200-resource-actions.png` and `local-skills.png`. The review covers the toolbox's desktop/compact/zoomed surfaces and action reachability within the incumbent console. Reported validation passed 116 unit tests, six packaged-desktop scenarios and virtual-clock lifecycle checks; a real Codex log read recognized 28 days. Missing/error source states, model/source detail and selected-directory flows were not independently visually captured. No actual shutdown was performed. This bounded extension review does not certify the whole application; the existing visual world, tokens and earlier verification history remain unchanged.

The v1.5.0 daily-tools finish review disposition is **ship**, with no material fixes outstanding. All 13 captures in `artifacts/v15/` were accepted: desktop/compact/125%/150%/200% pause and action views, desktop and 200% note editors, and the reminder. The document pass inspected `desktop-pause.png`, `desktop-notes.png`, `zoom200-actions.png` and `reminder.png`. Reported validation passed 108 unit tests, five packaged-desktop scenarios and three theme-regression groups. This is a bounded extension review, not whole-application recertification: the exact-time pause branch, mini/tray and template surfaces were not separately captured in this set, and no actual shutdown was performed. Incumbent design tokens and the visual world are unchanged.

The v1.4.3 theme-hub finish review disposition is **ship** for all ten captures in `artifacts/v143/`: `desktop.png`, `desktop-actions.png`, `compact.png`, `compact-actions.png`, `zoom125.png`, `zoom125-actions.png`, `zoom150.png`, `zoom150-actions.png`, `zoom200.png` and `zoom200-actions.png`. This covers the 星眠 panel and action reachability at desktop, compact, 125%, 150% and 200% settings; original-client visual acceptance remains separate.

The v1.4 theme-panel finish review disposition is **ship for the 星眠 panel only**. Its sole requested body-text correction to 13px is resolved. This disposition does not cover successful skinning or visual acceptance inside Codex or Claude; those original-client results remain unverified.

Current v1.3 review captures are `.impeccable/review/v13/full.png`, `mini.png`, `full-1.png`, `agenda-2.png`, `mini-2.png`, `templates.png`, `template-editor.png` and `settings.png`. The independent finish review accepted all eight captures, covering full/minimum layouts, mini, seven-day preview and dialogs with safe-test fixtures. Earlier v1.2 captures below remain historical evidence. Dimensions are logical DIP; device scaling changes physical image dimensions.

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

The v1.3 distribution captures are in `docs/images/v1.3.0/`; `full.png`, `mini.png`, `full-1.png`, `agenda-2.png`, `mini-2.png`, `templates.png`, `template-editor.png` and `settings.png` correspond to the current review set and are included in the source archive.

### DeepSeek Wallpaper Extension (v1.4.2)

“DeepSeek 背景” inherits the navy-and-ice Chinese console. An image-led collection sits beside a larger image preview; both use 16:9 crops and gently rounded corners (8px). Selected tiles pair an ice border with `aria-pressed`. At widths up to 720px the collection stacks above the preview, with two thumbnail columns. At heights up to 500px the integration view compacts global chrome while retaining pause, settings, the safe-test badge and return navigation.

The original Mist wallpapers “潮汐琉璃” and “云湾” are labeled AI-generated. Export is the primary action; numbered, 13px instructions explain manual import through Dream Skin. Preview captions distinguish the image from the actual DeepSeek result. Export, selection and library removal never imply that a background has been applied to the client.

Implementation: `src/components/Wallpapers.tsx`, `src/components/Integrations.tsx` and `src/integrations.css`. Independent finish review: **ship**, with no outstanding fixes. Reviewed captures: `artifacts/v142/desktop.png`, `compact.png`, `zoom200.png` and `zoom200-actions.png`; this disposition covers the wallpaper panel, not native-client visual acceptance.

## v1.7.0 Skills discovery

The toolbox adds a discovery tab with task-oriented search, repository results, a pinned-version audit, and installation history. Existing navy/ice tokens remain unchanged. File text is rendered literally, never as executable HTML. Review findings and source text share a two-column desktop layout and stack below 1000px. Installation shows the exact target and a deliberate confirmation. Success is file-level, not a claim that an Agent has loaded the skill. History uses inline removal confirmation and reversible restore. High-zoom layouts scroll and preserve keyboard access.

## v1.8.0 — Immersive flight deck

Surface mode: Operate inside an Experience scene. The approved cold-blue identity remains; the shell becomes four fixed space nodes over a single WebGL canvas. The camera, gate, orbital geometry and depth trails supply movement; all content remains ordinary keyboard-accessible DOM. Header status, pause, mini and settings stay reachable even at high zoom. Current panel size is bounded to the visible viewport; the lower-right handle and three presets share one persistence path.

The scene uses #050e1c depth, #84d9e9 gate highlights and #526eb4 orbital accents. Functional surfaces use #091727 with high opacity, #e0edf7 text and #abc6d9 supporting text. Theme gallery previews are controlled color mockups with a visible non-screenshot label; author, format, loader and apply state remain alongside each action. No remote stylesheet or script is rendered.

Behavior: 600 ms route travel, 0.65–1.5 zoom, 60 FPS target while active and 24 FPS target after 15 seconds idle. A production policy reduces density, pixel ratio and additive glow before static fallback. Hidden/minimized/mini cancels the decoration loop; reduced motion renders static states; real warnings freeze camera travel immediately. Classic mode disposes WebGL.

Visual review completed as a batch covering full, narrow, library and 100–200% layouts. The correction batch reduced repeated client status content, repaired short-height header reachability, and strengthened gate/trail visibility. Confirmation uses the packaged v1.8.0 build.

## v1.9.0 refinement
Startup and observation are Experience surfaces; the regular console and theme studio remain Operate. Keep pause/settings/window controls reachable while panels recede. Never animate the skip control out of view. Use an orbital brand mark, self-hosted Rajdhani wordmark, clear Chinese headings and deliberate scene margins. Gallery covers distinguish palette artwork from actual screenshots. Creation separates local saving, exporting and applying; side-by-side fields and live preview collapse into one column at narrow widths. Preserve full operation at 200% zoom.

## v1.9.1 cinematic arrival

Make scale legible through eight repeated mechanical gates, close foreground silhouettes and a continuous forward camera move. The 6.4-second timeline progresses through charge, transit and arrival, with cold illumination, restrained roll and a slowing title reveal. Keep the center free of functional panels until arrival; leave skip and safety controls immediately operable. No new background music or rapid flashes. The cinematic geometry belongs to the existing renderer and is disposed at exit. Static quality and reduced motion bypass the automatic sequence. Packaged UI checks cover interruptibility, hidden rendering, high zoom and explicit replay with automatic playback disabled.

## v1.10.0 everyday operation

Operate mode: keep the existing scene and typography, reduce duplicated Agent headings and let usage data lead. The command palette searches local actions, prioritizes names, supports arrow keys and restores focus. It only opens existing workflows and yields to reminders. Usage detail uses a native expandable table with horizontal scrolling inside its own region. Missing sources remain visibly incomplete; cache share is a token ratio, not savings or account balance. System status uses a compact definition list above read-only diagnostics; issue counts and a filter make follow-up work easier to find. Preserve tab-local drafts while mounted and stop scheduled usage requests when the usage tab is not visible.
