/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.PC_TITLE, // the name lives in js/title.js
  cols: ['1 player · the yellow square', 'the blue square (2 players)'],
  keys: [
    ['move the square', 'W A S D', '← ↑ → ↓'],
    ['turn the pipe in the square', 'Space or F', 'Enter'],
    ['call your brother (2 players: high five)', 'T', 'T'],
    ['start this level again', 'R', 'R'],
    ['pause · sound', 'P or Esc · M', 'P or Esc · M'],
    ['menu: PUZZLES · RACE', '1 · 2', '1 · 2'],
    ['menu: Teddy or Tommy · 1 or 2 players · level', '← → · ↑ ↓ · L', '← → · ↑ ↓ · L'],
  ],
  note: 'Turn the pipes so the water runs from the tap to every flower. In 1 player both sets of keys work. In a 2-player race the yellow keys play the left garden and the blue keys the right one.',
  touch: "Tap a pipe to turn it. Tap your brother's face (bottom right) and he turns a pipe the right way for you.",
});
