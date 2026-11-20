# SpaX — Spa Operations Dashboard (React)

Front end for the SpaX Figma design (`spax-blue`): a manager workspace and a staff workspace.
Each one opens on an overview page that summarises every function and links to the detail pages.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

## Routes (hash router, so it works on any static host)

| Route | Page |
| --- | --- |
| `#/` | Workspace picker (Manager / Staff) |
| `#/manager` | Manager overview: bookings, staff insights, next task, AI assistant, training analysis, staff grid, AI insights, quick actions |
| `#/manager/rooms` | Rooms by floor (Location view) |
| `#/manager/map` | Live floor map: status pins, staff, voice/photo notes, needs-attention panel |
| `#/manager/tasks` | Task board (List view) with step-by-step SOP, product kit and AI help |
| `#/manager/schedule` | Room × hour booking grid, AI vs manual assignment, booking task progress |
| `#/manager/training` | Training & procedures library + team completion |
| `#/staff` | Staff overview: next task, today's tasks, shift time tracker, training, weekly leader, productivity |
| `#/staff/rooms`, `/map`, `/tasks`, `/training` | Staff versions of the shared pages (filtered to the signed-in therapist) |

## How it's put together

- `src/components/Shell.jsx` – fixed 1552×872 design canvas scaled to the window (wall-screen / tablet style), top bar (clock, notification pill with countdown, night toggle, account menu / role switch), List·Location·Map switch, radial navigation, "now playing" mini player.
- `src/components/Overlays.jsx` – global search, AI assistant chat (canned local responses), reusable form modal.
- `src/data/store.jsx` – all mock data plus a reducer (tasks, rooms, notes, blocks). Completing an SOP step updates the task card, room cards, map pins and overview counts together.
- `src/data/assets.js` – every image the UI uses. These were cropped from the Figma frames at 1× because the
  screens are flattened images in the file; drop the original high-res exports into `src/assets/` with the same names to sharpen them.
- Pages live in `src/pages/` (`manager/`, `staff/`, `shared/` for pages both roles use).

## Hooking up real data

Replace the seed arrays in `src/data/store.jsx` (STAFF, TASKS, ROOMS, BOOKINGS, SCHEDULE, TRAINING) with API calls,
and swap `useAssistantReply` in `Overlays.jsx` for a call to your assistant backend.
