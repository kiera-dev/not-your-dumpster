# JIMOTHY: THIS IS NOT YOUR DUMPSTER

Phaser point-and-click web-game scaffold for an itch.io build.

## Current playable slice

The current slice implements the complete story through the grape ending:

1. Alley with a separate closed dumpster beneath the ladder near the city door.
2. Click dumpster → short automatic Jimothy waddle → open-dumpster sprite swap.
3. Full-screen `bg_perfect_grape.png` reveal.
4. Click grape → return to the alley with the dumpster still open. The closeup can
   be revisited and backed out of, but the grape cannot yet be taken.
5. Clerk entrance and permit interruption.
6. Permit Office ticket 033, Form 8-B, residency proof, and the $1.13 tax debt.
7. Alley residency errand with the leaf, takeout box, receipt, and optional cone incident.
8. Sanitation orientation with the chained pen, Beaver's lunch, classification puzzle,
   scrolling refuse ticker, and Spoon market crash.
9. Municipal hearing and denial for missing Form 12-C.
10. Return to the permit counter, receive Form 12-C, use Jimothy's one-and-only
    hiss sprite, unlock Feral Mode, and click the form to eat it in two submissions.
11. Take the chained pen by taking the entire desk; its loose contents spill onto
    the floor and the newly anarchic plant finally thrives.
12. Return to the corrected City of Seattle alley, optionally move the cone again,
    and revisit the dumpster.
13. Take and eat the grape, reveal the empty-dumpster shot, and reach the ending card.
14. Use **Play Again** to reset every story flag and restart from the closed dumpster.

## Controls and progression

- Click a prop or character to interact with it.
- Click anywhere on a dialogue card to advance to its next line.
- Choose a labeled response when a choice card appears.
- Use the paper exit prompt in the upper right to move to the next room.
- Room changes are not timed. The only automatic return is after Jimothy picks up the leaf.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the local address shown in the terminal. Click the separate dumpster near the city door to begin.

## Build for itch.io

```sh
pnpm build
```

Zip the **contents** of `dist/` (so `index.html` is at the root of the ZIP), upload it as an HTML game, and enable the itch.io fullscreen button. The build uses relative paths so it works inside itch.io's generated embed directory.

## Architecture

- Logical world: `2048 × 1152`, scaled to fit the browser.
- Scene placement: `src/config/sceneLayouts.js`.
- Asset paths: `src/config/assets.js`.
- Dialogue and objective flags: `src/state/GameState.js` and `src/systems/ui.js`.
- Movement: short tweened auto-waddles to configured approach points.
- No Arcade Physics, collision world, navigation mesh, or pathfinding.
- Asset files are copied unchanged under `public/assets/`; the original folder hierarchy is preserved.

The canonical repository is maintained under Kiera's personal GitHub account.
The project may also be featured through Anglerfish Labs and its game-jam work.
