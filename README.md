# JIMOTHY: THIS IS NOT YOUR DUMPSTER!

Jimothy wants one thing. One delicious, tasty, purple, grape-like thing: 

A grape.

A classic point and click adventure! 

<img width="1584" height="898" alt="title screen" src="https://github.com/user-attachments/assets/76299067-f32d-41fc-9c37-3592b7a7a9d4" />
&nbsp;&nbsp;&nbsp;

<img width="1584" height="898" alt="game" src="https://github.com/user-attachments/assets/c96c0cb3-5c3b-41dd-be88-7b2cde8fb4e6" />

<br><br>


Made for the Jimothy Jamothy game jam hosted by Seattle Indies :) 

Phaser scaffold for an itch.io build.
Sound assets by FilmCow + moonlitmosh
Controls: Point, click 🙃

<br><br><br><br>

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

Open the local address shown in the terminal. 


## Architecture

- Logical world: `2048 × 1152`, scaled to fit the browser.
- Scene placement: `src/config/sceneLayouts.js`.
- Asset paths: `src/config/assets.js`.
- Dialogue and objective flags: `src/state/GameState.js` and `src/systems/ui.js`.
- Movement: short tweened auto-waddles to configured approach points.
- No Arcade Physics, collision world, navigation mesh, or pathfinding.
- Asset files are copied unchanged under `public/assets/`; the original folder hierarchy is preserved.
