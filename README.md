# TT Pipe Connect

[![TT Pipe Connect title screen](docs/screenshot.jpg)](https://adong.github.io/pipes-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

Turn the pipes so the water runs from the tap to every flower. 40 gardens, from Tommy's tiny 3 × 3 beds with one pipe the wrong way to Teddy's 7 × 7 beds full of loose pipes, a team mode, a race, and your brother on call to turn a pipe for you.

**中文：** 接水管：旋转水管，把水龙头和每一朵花连接起来。40 关，有组队模式和比赛；叫兄弟来，他会帮你把一根水管转对。

A chunky pipe puzzle starring Teddy and Tommy, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. Each level is a wooden garden bed sitting on a lawn behind a white picket fence, with the boys standing beside it. There are no image, model or audio files: the boys are the kit's blocky characters, every texture is painted on a canvas, and every sound is synthesised.

Alan names the games himself. The name lives in one constant, `PC_TITLE` in `js/title.js`, and the page title, the logo and the ? panel read it from there.

## Play

- **Double-click `index.html`.** It works offline because Three.js and the kit are copied into `kit/`. Without internet the title font falls back to Arial Black.
- **Send one file:** `dist/pipes-tt.html` is the whole game in one page. AirDrop or email it, then open it in a browser.
- Rebuild that file after any edit: `python3 kit/tools/bundle.py . --name pipes-tt`

### The garden

- **The tiles:**
  - **the water tank** (🚰, blue) is where the water comes from;
  - **flower pots** start as sprouts (🌱) and pop into 🌷 🌻 🌼 🌸 🌺 when the water gets to them;
  - **cream tiles** carry a pipe you can turn: straight, corner or T;
  - **grey tiles with bolts** carry a pipe that's bolted down (it never turns);
  - **grass**, some with a rock, carries nothing.
- **Tap a pipe** to turn it a quarter turn clockwise. On the keyboard, move the square with the arrows (or W A S D) and press Space or Enter.
- **The water** runs through every pair of tiles whose pipes face each other. Pipes turn blue as the water runs along them, tile by tile from the tank, and a pipe that opens onto nothing drips 💧. Drips are fine: the level is done when **every flower** has water.
- **Taps and stars:** the HUD counts your taps and shows the 3-star goal next to it. ⭐⭐⭐ for close to the fewest taps the garden was made to need (a little slack: 2 taps, plus 1 for every 5), ⭐⭐ up to about twice that, ⭐ for any win. Your brother's turns don't count.
- **🔄** starts the level again (R).
- **A win:** the last flower blooms, the boy does his signature move (Teddy's boxing combo or 🏀 jump shot, Tommy's Y with peace fingers), confetti, and the stars light up one by one with your TAPS, the 3-star GOAL, how many pipes your brother turned, and your record (fewest taps) for that level. Then **▶** for the next level, **PLAY AGAIN**, **🔢** for the level picker or **🏠**.

### The levels

- **🐣 EASY** (the default, for Tommy, 5): 20 levels. Tiny 3 × 3 gardens first with one or two pipes the wrong way, then up to 6 × 6 with three flowers and a few loose pipes. Some of the right pipes are bolted down, so there's less to turn.
- **🔥 NORMAL** (for Teddy, 8): 20 levels from 5 × 5 to 7 × 7, two to five flowers, every pipe on the way turned at random, and loose pipes nearly everywhere to fool you.
- **The level picker** (🧩 PUZZLES) shows each level's stars and its flowers. Every level is open; the next one without stars bounces. Stars are kept for Teddy, for Tommy and for the team (2 players) separately.
- **Where they come from:** `tools/make-levels.js` writes `js/levels.js` (seeded, so it makes the same file every time). For each level it grows a random tree of pipes over the grid, puts the tank on one leaf and flowers on others, keeps only the pipes on the way from the tank to the flowers, and turns some of them the wrong way. The other tiles become grass, rocks or loose pipes. A level is kept only when no flower has water at the start and the solver finds a way quickly.

### Modes

- **🧩 PUZZLES, 1 player:** you (Teddy or Tommy) and your brother on call.
- **🧩 PUZZLES, 2 players: TEAM.** Both brothers work on one garden at the same time: tap any pipe, or use the yellow square (W A S D + Space) and the blue square (arrows + Enter).
- **🏁 RACE:** the same garden twice; the first to water every flower wins the round, and the first to 2 rounds wins the race. A tag over each garden counts its watered flowers (🌷 1 / 3).
  - **1 player** races a friend on a podium: **🐣 Froggy 🐸** (a quarter turn every 2.4 to 3.4 s, 3 in 10 of them a slip on a random pipe) or **🔥 Foxy 🦊** (every 1.5 to 2.2 s, 2 in 10 slips). Otherwise they turn the pipe the solver says is next. Your brother can still help (T).
  - **2 players** race each other: Teddy on the left garden, Tommy on the right (one above the other on a tall screen). Each taps his own garden, or uses his own keys.

## Controls

| | 1 player (both work) / yellow square | Blue square (2 players) | Touch |
|---|---|---|---|
| move the square | W A S D | ← ↑ → ↓ | |
| turn the pipe in the square | Space or F | Enter | tap the pipe |
| call your brother (2 players: high five) | T | T | his face, bottom right (🙌 in 2 players) |
| start this level again | R | | 🔄 |
| pause · sound | P or Esc · M | | ⏸️ · 🔊 |
| menu: PUZZLES · RACE | 1 · 2 | | the two big tiles |
| menu: Teddy or Tommy · 1 or 2 players · level | ← → · ↑ ↓ · L | | the buttons under the tiles |

The first Space or Enter only shows the square; after that it turns the pipe. In the level picker the arrows choose a level, Enter plays it and L switches 🐣 / 🔥.

## Call your brother (companion mode)

**1 player:** call your brother with **T** or by tapping his face (bottom right), **any time and as often as you like** (`Kit.roster.buddyFor`: Tommy for Teddy, Teddy for Tommy).

- **He pops in** beside the garden in a puff of stars, at his roster `buddyScale`, with his name tag.
- **He says hi** with his signature move (Tommy's Y with peace fingers, Teddy's boxing combo or jump shot) and **tosses you a treat** (🍦 💧 🧃 🍪 🍉 🍌) that arcs into your hand: "🍌 BANANA FROM TEDDY!"
- **Then he turns one pipe right.** The next pipe the water needs (counting from the tank) gets a gold square and a bouncing 👇, he turns and points at it ("TOMMY SAYS: LET ME TURN THIS ONE!", in 中文 "TOMMY 说：这根水管我来转！"), and a moment later it spins round to the right way in a puff of stars. If you turn that pipe yourself first, he lets you.
- **Then** he does his goodbye move and pops out. Call him again while he's there and he brings another treat and turns another pipe. Keep calling and he'll water the whole garden. In a race he helps on your garden.

**2 players:** both brothers are already at the garden, so **T** (or 🙌) is a **high five**: they run together, slap hands (💥) and run back. It doesn't change the game.

## Make it yours

- `js/title.js`: the game's name.
- `tools/make-levels.js`, top: the ladder (grid size, flowers, how far the farthest flower is, how many pipes start wrong, loose pipes, rocks, bolts and the taps each level should need). Run `node tools/make-levels.js` to rebuild `js/levels.js`, then `node tools/check.js`.
- `js/game.js`, top: `CFG` (the camera angle, the boys' size, the race gardens, Froggy's and Foxy's speed and slips, the title demo's level).
- `js/rules.js`: `stars()` and `goal()` (the star thresholds).
- `js/grid.js`: the colours of the tiles, pipes and water, and the flowers (`BLOOMS`).

## How it works, and how it's tested

- `js/rules.js` has no Three.js and no page in it. A tile's openings are 4 bits (N 1, E 2, S 4, W 8); a quarter turn shifts them round.
  - `PC.flow` is the water: a breadth-first run from the tank through every pair of tiles that face each other. It also lists the leaks.
  - `PC.search` / `PC.solve` is the solver. It decides tiles in the order the water reaches them, trying each way a pipe can face (the way it faces now first). It gives up on a branch when no undecided pipe is being poured into, or when a flower couldn't be reached even if every undecided pipe opened every way. The answer is cut down to the pipes on the way from the tank to each flower (`need`: which sides each must open).
  - `PC.fix` is your brother's turn: the first pipe along that way that doesn't open the sides it needs, and how many quarter turns put it right. `PC.replan` keeps the same plan between calls unless a fresh search needs fewer pipes turned, so every call gets one pipe closer.
- `js/board.js` is the garden you play: taps, keys and your brother's help become quarter turns; it counts taps, works out the water after every turn and calls the win once. `js/grid.js` draws it.
- Console hooks (`window.game`):

```js
game.start({ mode: 'puzzle', players: 1, who: 'tommy', level: 'e4' })   // straight into a level (e1..e20, n1..n20)
game.start({ mode: 'race', players: 1, who: 'teddy', tier: 'normal' })   // a race against Foxy
game.tap(7)              // tap tile 7 on garden 0 (turns it if it's a pipe that turns)
game.hint()              // the pipe your brother would turn next { i, to, turns }
game.solve()             // turn the plan's pipes until every flower has water
game.call()              // call your brother (2 players: high five)
game.key('d')            // a key press, as if typed
game.step(2)             // advance 2 s and draw (when the browser tab's animation is throttled)
game.hold(true)          // freeze the live loop, so only game.step() moves time
game.auto(true, 1)       // a test bot taps the plan's next pipe on your garden, once a second
game.check({ quick: true })  // the headless checks below
game.info()              // state, gardens, taps, flowers, the brother, the race
```

The same checks run from a terminal with Node:

```bash
node tools/check.js
```

```bash
node tools/check.js --sabotage oneway
```

```bash
node tools/check.js --sabotage stuck
```

```bash
node tools/check.js --sabotage lazy
```

- **Every level is solvable:** 40 levels, 20 a tier, each a proper garden (one tank, flowers with one opening each, at most 7 × 7), no flower has water at the start, the solver finds a way from the start, and setting its pipes really does water every flower (`PC.flow`). Playing your brother's help from the start takes no more turns than the 3-star goal, so 3 stars are always in reach.
- **The water's flow is right:** hand-made gardens with known answers, then thousands of random gardens where `PC.flow` must agree with a separate union-find of the tiles that face each other: which tiles are wet, how many flowers, done or not, and every leak. Half the random gardens are a random tree of pipes with flowers on its leaves and a few pipes turned, so about a third have every flower watered.
- **Your brother's help always works:** from the start and from gardens after random taps, every pipe he turns brings the pipes still needed down by exactly one, he only turns pipes that turn, and he always finishes.
- **The board:** a tap turns a pipe a quarter and counts, the tank and bolted pipes refuse, restart resets, the win comes once, your brother's turns don't count as taps.
- **It can fail:** `--sabotage oneway` lets water pour into a pipe whichever way it faces (the flow check fails), `--sabotage stuck` adds a flower walled in by rocks (the level check fails), and `--sabotage lazy` makes your brother turn a pipe one quarter, right or not (the help check fails). A sabotaged run checks the flow first and stops at the first group that fails.
- **At the last check** (`node tools/check.js`, 17 s): flow 3,927 passed (3,798 random gardens agreed with the union-find, 1,150 of them fully watered), levels 324 passed (40 of 40 watered by the solver, at most 9,309 search steps), help 10,452 passed (2,472 pipes turned from 275 gardens, at most 10,064 search steps), board 8 passed, nothing failed. Each sabotage failed: oneway (S2P5F8: wet 110, expected 100), stuck (the solver found no way to water the flower), lazy (a turn left the pipes still needed at 2).

## Not verified

- Sound: tested muted, checked in code, never listened to.
- Real touch devices (iPhone, iPad): taps were tested with a mouse and the test hooks; layouts at 390 × 844, 740 × 360, 768 × 1024, 1024 × 768 and 1200 × 750.
- How hard it is for real kids: whether Tommy can do the 6 × 6 EASY gardens, whether Froggy and Foxy are beatable, whether Teddy enjoys the 7 × 7 ones.
- Double-click from Finder and the iPad home-screen icon. Both pages boot and play a level from `file://` in headless Chrome.

Built with [Claude Code](https://claude.com/claude-code). Three.js is MIT licensed (`kit/three.LICENSE`); the kit's icons are Lucide (ISC).
