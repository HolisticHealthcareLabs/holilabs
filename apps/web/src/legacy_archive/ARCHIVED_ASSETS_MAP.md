# Archived Assets Map

This folder contains legacy code from the "Clinical OS" and "Co-pilot" phase, archived on 2026-02-03.
These features were deactivated to pivot to the "Universal Validation Layer" & "Shadow Mode" console.

## Architecture Change
*   **Old Strategy:** Deep Vertical Integration (EHR, Appointments, Telehealth).
*   **New Strategy:** Horizontal "Over-the-Top" Validation Layer (Sidecar + Console).

## Archived Directories

| Original Path | Archived Location | Description |
| :--- | :--- | :--- |
| `/dashboard/co-pilot` | `./co-pilot` | The main "AI Scribe" interface. |
| `/dashboard/scribe` | `./scribe` | Speech-to-text logic and SOAP note generation. |
| `/dashboard/patients` | `./patients` | Patient list and demographics management. |
| `/dashboard/appointments` | `./appointments` | Calendar and scheduling. |
| `/dashboard/messages` | `./messages` | Chat/Inbox system. |
| `/dashboard/prescriptions`| `./prescriptions` | CPOE (Computerized Physician Order Entry) UI. |
| `/dashboard/video` | `./video` | Telehealth video call components. |

## How to Restore
To restore any feature:
1.  Move the folder back to `apps/web/src/app/dashboard/`.
2.  Uncomment the relevant `NavItem` in `apps/web/src/app/dashboard/layout.tsx`.
