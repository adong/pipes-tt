/* 中文 for TT Pipe Connect: the words on the page, the toasts, the canvas text (the BLOOM! bursts) and the ? panel
   (Kit.lang, from kit/lang.js). Simple words for Tommy (5): 水管, 旋转, 连接. The kids' and friends' names and the game's
   own name stay English. */
(function () {
  const L = Kit.lang;
  L.keep(['TT Pipe Connect', 'TT', 'Pipe Connect', 'TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'Esc', 'Enter', 'Space', 'W A S D', 'VS']);

  L.add({
    // home
    'WATER THE FLOWERS!': '接水管，给小花浇水！',
    PUZZLES: '闯关', 'Puzzles': '闯关', 'Puzzles (1)': '闯关 (1)', RACE: '比赛', 'Race': '比赛', 'Race (2)': '比赛 (2)',
    'Players': '几个人玩', 'Who are you?': '你是谁？', 'Level': '难度',
    // the level picker, the panels
    'Home': '主页', 'Levels': '选关', 'Next level': '下一关', 'Play again': '再玩一次', 'Keep playing': '继续玩', 'Start again': '重新开始',
    'Start again (R)': '重新开始 (R)', 'Next round': '下一局',
    // while playing
    'TAPS': '旋转', 'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'High five!': '击掌！', 'High five! (T)': '击掌！(T)', 'HIGH FIVE! 🙌': '击掌！🙌',
    'TEAM TT: BOTH OF YOU TURN PIPES!': 'TT 兄弟一起旋转水管！',
    'TEAM TT DID IT!': 'TT 兄弟成功啦！', '⭐⭐⭐ GOAL': '⭐⭐⭐ 目标', 'NEW RECORD!': '新纪录！', 'YOUR RECORD': '你的纪录',
    // canvas text
    'BLOOM!': '开花啦！',
    // the ? panel (js/keys.js)
    '1 player · the yellow square': '单人 · 黄色方框', 'the blue square (2 players)': '蓝色方框（双人）',
    'move the square': '移动方框', 'turn the pipe in the square': '旋转方框里的水管',
    'call your brother (2 players: high five)': '叫兄弟来帮忙（双人：击掌）', 'start this level again': '这一关重新开始',
    'menu: PUZZLES · RACE': '菜单：闯关 · 比赛', 'menu: Teddy or Tommy · 1 or 2 players · level': '菜单：Teddy 还是 Tommy · 单人或双人 · 难度',
    'Turn the pipes so the water runs from the tap to every flower. In 1 player both sets of keys work. In a 2-player race the yellow keys play the left garden and the blue keys the right one.':
      '旋转水管，把水龙头和每一朵花连接起来，让水流过去。单人时两套按键都能用。双人比赛时，黄色按键玩左边的花园，蓝色按键玩右边的。',
    "Tap a pipe to turn it. Tap your brother's face (bottom right) and he turns a pipe the right way for you.":
      '点一下水管，它就旋转。点右下角兄弟的头像，他会帮你把一根水管转对。',
    'Space or F': '空格或 F', 'P or Esc · M': 'P 或 Esc · M',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^(🐣|🔥) LEVEL (\d+)$/, '$1 第 $2 关');
  L.rule(/^Level (\d+)$/, '第 $1 关');
  L.rule(/^Call (\S+) \(T\)$/, '叫 $1 (T)');
  L.rule(/^(\S+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(\S+) SAYS: LET ME TURN THIS ONE!$/, '$1 说：这根水管我来转！');
  L.rule(/^(\S+) SAYS: ALL GOOD!$/, '$1 说：都连接好啦！');
  L.rule(/^(\S+) TURNED$/, '$1 帮你转了');
  L.rule(/^YOU DID IT, (\S+)!$/, '$1，小花都喝到水啦！');
  L.rule(/^(\S+) WATERED THEM FIRST!$/, '$1 先浇好了花！');
  L.rule(/^(\S+) WINS THE RACE!$/, '$1 赢得比赛！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
})();
