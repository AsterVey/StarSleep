# 星眠
## Platform
web (Windows desktop shell)
## Stack
Delegated by user: Electron, React, TypeScript, Vite, electron-builder.
## Users
Windows users running long overnight work who want a precise shutdown time and local alarms.
## Product Purpose
Create, edit, delete and toggle dated or recurring shutdown/alarm schedules. No cloud or subscriptions.
## Operating Context
Only active while running. Close hides to tray; explicit quit stops every pending execution. No startup registration, OS scheduled tasks, wake timers or catch-up shutdown.
## Brand Commitments
Chinese interface named 星眠; black-blue starship console, icy blue light, a compact circular countdown, pointer ripples, electronic click feedback. Give schedule management more space; narrow windows stack the instrument above the list. Hidden window stops all decorative animation.
## Capabilities and Constraints
One-time, daily, selected weekdays. Shutdown warning defaults to five minutes, configurable to 1/5/10/15/30 minutes; cancel occurrence or snooze 10/30/60 minutes. Alarm duration defaults to 60 seconds, configurable to 15/30/60 seconds. Forced shutdown may discard unsaved work. Active reminder deadlines remain fixed when settings change. Offline local persistence and backups. Tests must never shut down the actual computer.

v1.2.0 adds search, action/status filters, sorting, batch operations, disabled copies, skipping the next occurrence, ended-single-plan cleanup, four confirmation-first templates, and filtered log export. Keep storage schema 2 and plan transfer format 1. User pause and storage-fault protection remain distinct. Only clocks refresh each second; plans/logs sync on content change. Audio stops at its fixed deadline even when hidden.

## Delivery Boundary
Windows x64 local experience build only. Do not publish v1.2.0 to GitHub yet or change v1.0.0/v1.1.0 releases. Preserve the current user installation and real data during QA. Installer EXE is for installation; source ZIP is for developers. First author AsterVey; existing No-Sale License remains.
