# 星枢 StarNexus
## Platform
web (Windows desktop shell)
## Stack
Delegated by user: Electron, React, TypeScript, Vite, electron-builder.
## Users
Windows users running long overnight work who want a precise shutdown time and local alarms.

v1.6.0 expands the audience to daily Agent users who need local token visibility and a useful collection of skills, plugins and tools. Reuse mature open-source implementations before creating parallel engines. The toolbox embeds the unmodified MIT ccusage 20.0.24 Windows binary for Codex and Claude Code daily logs, with local-only summaries and explicit unsupported-source states. It does not report account quotas or subscription bills. Curated author repositories, personal favorites/notes and a read-only local skills inventory complement the original scheduling and theme features. No automatic plugin installation or execution is implied by a bookmark.
## Product Purpose
Create, edit, delete and toggle dated or recurring shutdown/alarm schedules. No cloud or subscriptions.
## Operating Context
Only active while running. Close hides to tray; explicit quit stops every pending execution. No startup registration, OS scheduled tasks, wake timers or catch-up shutdown.
## Brand Commitments
Chinese interface named 星枢 StarNexus; black-blue starship console, icy blue light, a compact circular countdown, pointer ripples, electronic click feedback. Give schedule management more space; narrow windows stack the instrument above the list. Hidden window stops all decorative animation.
## Capabilities and Constraints
One-time, daily, selected weekdays. Shutdown warning defaults to five minutes, configurable to 1/5/10/15/30 minutes; cancel occurrence or snooze 10/30/60 minutes. Alarm duration defaults to 60 seconds, configurable to 15/30/60 seconds. Forced shutdown may discard unsaved work. Active reminder deadlines remain fixed when settings change. Offline local persistence and backups. Tests must never shut down the actual computer.

v1.2.0 adds search, action/status filters, sorting, batch operations, disabled copies, skipping the next occurrence, ended-single-plan cleanup, four confirmation-first templates, and filtered log export. Keep storage schema 2 and plan transfer format 1. User pause and storage-fault protection remain distinct. Only clocks refresh each second; plans/logs sync on content change. Audio stops at its fixed deadline even when hidden.

## Delivery Boundary
Windows x64 local experience build only. Do not publish v1.3.0 to GitHub yet or change v1.0.0/v1.1.0 releases. Preserve the current user installation and real data during QA. Installer EXE is for installation; source ZIP is for developers. First author AsterVey; existing No-Sale License remains.

## v1.3.0 surfaces
Reuse one window for full and 320×168 DIP mini modes; restart full, restore full for reminders, retain filters and guard open panels. Main process expands seven future local days only on changes or time boundaries. Personal templates prefill only, never execute until confirmation. Starship status uses fault > shutdown reminder > alarm > pause > run > idle. Preferences, templates and window bounds live separately in experience.json version 1. Preserve all v1.2.0 local artifacts.

## v1.4.0 development preview
The theme target is the original Codex / Claude / DeepSeek Harness interface. StarSleep is a configuration assistant, not a replacement client or a skin preview passed off as an applied theme. Keep import, configuration write and native visual verification distinct. Codex native appearance has selective backup/apply/restore. Claude requires a detected compatible Theme Mod loader; the installed MSIX client remains unsupported. Never install a different Claude distribution or change its executable as a side effect of applying a color JSON. Agent night watch is opt-in for selected active sessions and requires explicit task completion reports, a settling period and the normal shutdown reminder; all automation tests use a substitute executor. Native client end-to-end acceptance is still pending. Preserve v1.3.0 local artifacts and do not publish this preview to GitHub.

## v1.7.0 Skills lifecycle

GitHub discovery and source review lead into fixed-commit installation, native directory configuration, and reversible removal. Stars and search relevance are evidence for discovery, not quality or safety certification. Supported local targets: Codex shared skills, Claude Code, and DeepSeek Harness. Ordinary Claude chat uses an exported ZIP plus user upload. No automatic dependency execution, arbitrary shell commands, or cloud account changes are part of installation.

## v1.8.0 local experience
An immersive StarSleep flight deck and community Agent theme workshop are separate surfaces. Four persistent nodes retain React DOM functionality behind one Three.js canvas. Adaptive rendering, hidden/mini pause, immediate reminder priority and classic mode preserve utility. Curated fixed-commit theme downloads are data only; author links handle executable loaders. Configuration write and user visual confirmation are separate. Read-only diagnostics and a durable Skills operation journal complete the workflow. No account platform, public release, real shutdown test, or changes to installed client binaries.

## v1.9.0 identity and creation
First author remains AsterVey. Brand changes to 星枢 StarNexus; do not change application ID, data path, connection ownership markers or historical releases. Startup is a skippable 3.8-second single-canvas introduction. Observation mode hides panels, preserves state and yields immediately to reminders. A theme studio generates validated native color formats for all three clients and a data-only Codex Dream Skin image ZIP. No real client or installation changes during QA.

## v1.10.0 daily workflow
The v1.9.1 6.4-second gate flight remains. Add local command discovery, daily token detail, explicit incomplete-source coverage, tab-state retention and a system summary. Explicit usage refresh bypasses completed cached results; concurrent readers share a scan. Diagnostics are read-only and distinguish file checks from actual client behavior. No new provider integrations, dependencies or storage migrations in this iteration; no public release or real-client changes during validation.
