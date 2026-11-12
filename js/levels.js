/* Yapboz Dünyası — seviye zorluk tablosu (YB.Levels) */
window.YB = window.YB || {};
YB.Levels = (function () {
  'use strict';

  var COUNT = 100;

  // [sonSeviye, cols, rows, shape, ghost, grid, snap]
  var TABLE = [
    [3,   2, 1, 'rect',   0.55, true,  0.5],
    [6,   3, 1, 'rect',   0.5,  true,  0.5],
    [15,  2, 2, 'rect',   0.45, true,  0.45],
    [20,  3, 2, 'rect',   0.45, true,  0.45],
    [25,  3, 2, 'jigsaw', 0.4,  true,  0.4],
    [30,  3, 3, 'rect',   0.4,  true,  0.4],
    [40,  3, 3, 'jigsaw', 0.35, true,  0.4],
    [50,  4, 3, 'jigsaw', 0.3,  true,  0.35],
    [60,  4, 4, 'jigsaw', 0.25, false, 0.35],
    [70,  5, 4, 'jigsaw', 0.2,  false, 0.35],
    [80,  5, 4, 'jigsaw', 0.12, false, 0.3],
    [90,  6, 4, 'jigsaw', 0.08, false, 0.3],
    [100, 6, 5, 'jigsaw', 0.05, false, 0.3]
  ];

  function clampLevel(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 1) n = 1;
    if (n > COUNT) n = COUNT;
    return n;
  }

  function get(n) {
    n = clampLevel(n);
    var row = TABLE[TABLE.length - 1];
    for (var i = 0; i < TABLE.length; i++) {
      if (n <= TABLE[i][0]) { row = TABLE[i]; break; }
    }
    return {
      n: n,
      world: Math.ceil(n / 10),
      cols: row[1],
      rows: row[2],
      shape: row[3],
      ghost: row[4],
      grid: row[5],
      snap: row[6],
      seed: n,
      tutorial: n <= 3,
      worldEnd: n % 10 === 0
    };
  }

  return { COUNT: COUNT, get: get };
})();
