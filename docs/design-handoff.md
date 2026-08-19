# Design handoff notes

Canonical direction reviewed from the “Jimothy Jamothy Game” design conversation.

## Locked implementation rules

- Point-and-click scenes, not a platformer or free-roaming physics game.
- Every interaction owns a generous hotspot and an `approachPoint`.
- Jimothy automatically waddles a short distance, changes pose, resolves the event, and returns to idle.
- All scene coordinates use a 2048×1152 logical world.
- Individually cropped PNG dimensions are intentional. Use bottom-center visual anchors and per-pose offsets; do not normalize or rescale the source art to matching canvases.
- Keep placement, depth, hotspots, and approach points in config so they can be tuned during visual QA.
- General depth order: background 0, behind-furniture NPC 10, counter 20, countertop props 30, free props 40, actors 50, effects 60, UI 100.
- In the Permit Office the clerk must be behind `office_counter.png`; move the clerk vertically to tune visible torso height rather than rescaling the clerk.
- The far-left dumpster baked into the alley background is scenery. The separate `dumpster_closed.png` / `dumpster_lid_open.png` pair is the interactive dumpster and sits beneath the ladder, near the city door, against the brick wall.
- Looking into the dumpster shows only `bg_perfect_grape.png`; returning to the alley shows the open dumpster.
- The authoritative Alley placement reference is `bg_alley_placement.psd` / `bg_alley_placement_ref.png` (2752×1536). Layer positions and transformed sizes are converted into the 2048×1152 logical game space. The letter is temporarily omitted and a crumpled receipt is present.
- Objective changes happen in the upper-left card: cross out the old current objective, then replace it. Do not use a full-screen System dialogue for routine objective changes.
- The authoritative Office 1 placement reference is `bg_office_1_placement.psd` / `bg_office_1_placement_ref.png` (2752×1536). The resized `huge_form_stack.png` layer is approximately 242×373 visible pixels in that reference. Preserve the PSD stacking order, especially clerk behind counter and Jimothy in front.
- All exported Jimothy walk frames face left. Flip the walking sprite only when moving right; idle/end facing is configured explicitly per approach point.
- Build and playtest one vertical slice before expanding the full story.

## First-slice state flags

- `dumpsterOpened`
- `grapeSeen`
- `grapeAttempted`
- `clerkInterrupted`
- `permitOfficeUnlocked`
- `enteredPermitOffice`

## Deliberately deferred

- Full inventory and document systems
- Sanitation sorting
- Trashconomy simulation
- Courtroom implementation
- Feral mode and finale
- Publishing repository/owner selection
