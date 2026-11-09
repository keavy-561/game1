import { CONFIG } from './data.js';

/* ==========================================================
   三消棋盘核心逻辑（纯逻辑，无 DOM）
   ========================================================== */

// 教程关卡 1 的手工棋盘（已验证：无初始匹配，引导线精确成立）
var TUTORIAL_MATRIX = [
  ['p', 'y', 'g', 'g', 'p', 'b'],
  ['b', 'g', 'y', 'y', 'g', 'p'],
  ['y', 'r', 'p', 'b', 'r', 'g'],
  ['b', 'p', 'r', 'y', 'g', 'y'],
  ['g', 'r', 'r', 'y', 'b', 'y'],
  ['y', 'g', 'b', 'p', 'y', 'g'],
  ['p', 'y', 'r', 'b', 'y', 'p'],
  ['r', 'b', 'g', 'y', 'p', 'b']
];
// 第一波消除后，第 2 列的补子队列（保证四连引导成立）
var TUTORIAL_REFILL = { 2: ['r', 'b', 'g'] };

var KEY_TO_TYPE = { r: 0, b: 1, g: 2, y: 3, p: 4 };

function Board(opts) {
  opts = opts || {};
  this.cols = opts.cols || CONFIG.COLS;
  this.rows = opts.rows || CONFIG.ROWS;
  this.rng = opts.rng || Math.random;
  this.tutorial = !!opts.tutorial;
  this.nextId = 1;
  this.grid = [];
  this.scriptRefill = null;
  this.init();
}

Board.prototype = {

  init: function () {
    this.grid = [];
    for (var r = 0; r < this.rows; r++) {
      var row = [];
      for (var c = 0; c < this.cols; c++) row.push(null);
      this.grid.push(row);
    }
    if (this.tutorial) {
      this.scriptRefill = {};
      for (var k in TUTORIAL_REFILL) this.scriptRefill[k] = TUTORIAL_REFILL[k].slice();
      for (var r2 = 0; r2 < this.rows; r2++) {
        for (var c2 = 0; c2 < this.cols; c2++) {
          var t = KEY_TO_TYPE[TUTORIAL_MATRIX[r2][c2]];
          this.grid[r2][c2] = this.makeTile(t, r2, c2);
        }
      }
    } else {
      this.generate();
    }
  },

  makeTile: function (type, r, c, special) {
    return { id: this.nextId++, type: type, special: special || null, r: r, c: c, el: null };
  },

  generate: function () {
    var tries = 0;
    do {
      for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
          var t = Math.floor(this.rng() * CONFIG.COLORS);
          this.grid[r][c] = this.makeTile(t, r, c);
        }
      }
      // 消除初始匹配
      var guard = 0;
      while (this.findRuns().length && guard < 200) {
        var runs = this.findRuns();
        for (var i = 0; i < runs.length; i++) {
          var mid = runs[i].cells[Math.floor(runs[i].cells.length / 2)];
          this.grid[mid.r][mid.c] = this.makeTile(Math.floor(this.rng() * CONFIG.COLORS), mid.r, mid.c);
        }
        guard++;
      }
      tries++;
    } while (!this.hasValidMove() && tries < 50);
  },

  at: function (r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    return this.grid[r][c];
  },

  isStone: function (tile) { return tile && tile.type === 'stone'; },

  makeStone: function (r, c) {
    // 原地转化（保留 DOM 元素引用）
    var t = this.grid[r][c];
    if (t) { t.type = 'stone'; t.special = null; }
    return t;
  },

  // 物理交换（不判断合法性）
  swapTiles: function (a, b) {
    var ta = this.grid[a.r][a.c], tb = this.grid[b.r][b.c];
    this.grid[a.r][a.c] = tb; this.grid[b.r][b.c] = ta;
    if (ta) { ta.r = b.r; ta.c = b.c; }
    if (tb) { tb.r = a.r; tb.c = a.c; }
    return [tb, ta];
  },

  canSwap: function (a, b) {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return false;
    var ta = this.at(a.r, a.c), tb = this.at(b.r, b.c);
    if (!ta || !tb) return false;
    if (this.isStone(ta) || this.isStone(tb)) return false;
    return true;
  },

  // 交换是否触发消除（含棱镜配对）
  isValidSwap: function (a, b) {
    if (!this.canSwap(a, b)) return false;
    var ta = this.at(a.r, a.c), tb = this.at(b.r, b.c);
    if (ta.special === 'prism' || tb.special === 'prism') return true;
    this.swapTiles(a, b);
    var ok = this.findRuns().length > 0;
    this.swapTiles(a, b);
    return ok;
  },

  /* ---------- 匹配检测 ---------- */
  findRuns: function () {
    var runs = [];
    var g = this.grid;
    function tOf(t) { return (t && t.type !== 'stone' && t.special !== 'prism') ? t.type : null; }
    // 横向
    for (var r = 0; r < this.rows; r++) {
      var c = 0;
      while (c < this.cols) {
        var t = tOf(g[r][c]);
        if (t === null) { c++; continue; }
        var len = 1;
        while (c + len < this.cols && tOf(g[r][c + len]) === t) len++;
        if (len >= 3) {
          var cells = [];
          for (var i = 0; i < len; i++) cells.push({ r: r, c: c + i });
          runs.push({ dir: 'h', cells: cells, type: t });
        }
        c += len;
      }
    }
    // 纵向
    for (var c2 = 0; c2 < this.cols; c2++) {
      var r2 = 0;
      while (r2 < this.rows) {
        var t2 = tOf(g[r2][c2]);
        if (t2 === null) { r2++; continue; }
        var len2 = 1;
        while (r2 + len2 < this.rows && tOf(g[r2 + len2][c2]) === t2) len2++;
        if (len2 >= 3) {
          var cells2 = [];
          for (var i2 = 0; i2 < len2; i2++) cells2.push({ r: r2 + i2, c: c2 });
          runs.push({ dir: 'v', cells: cells2, type: t2 });
        }
        r2 += len2;
      }
    }
    return runs;
  },

  /* ---------- 波次计算：清除集合 + 特殊棋子生成 ---------- */
  computeWave: function (swapCells) {
    var runs = this.findRuns();
    if (!runs.length) return null;

    var self = this;
    var clear = {};            // "r,c" -> {r,c}
    var creations = [];        // 本波生成的特殊棋子
    var createdIds = {};
    var usedCells = {};

    function key(r, c) { return r + ',' + c; }
    function addClear(r, c) { var k = key(r, c); if (!clear[k]) clear[k] = { r: r, c: c }; }

    // 标记所有待清除格
    runs.forEach(function (run) {
      run.cells.forEach(function (cl) { addClear(cl.r, cl.c); });
    });

    // 找交叉点（L/T 形）
    var crossCells = {};
    runs.forEach(function (run) {
      run.cells.forEach(function (cl) {
        var k = key(cl.r, cl.c);
        if (crossCells[k]) crossCells[k].count++;
        else crossCells[k] = { r: cl.r, c: cl.c, count: 1 };
      });
    });
    var crosses = {};
    for (var k2 in crossCells) {
      if (crossCells[k2].count >= 2) crosses[k2] = crossCells[k2];
    }

    var swapKeys = {};
    (swapCells || []).forEach(function (s) { swapKeys[key(s.r, s.c)] = true; });

    function pickSpot(run) {
      // 优先交换落点，其次中点
      for (var i = 0; i < run.cells.length; i++) {
        var cl = run.cells[i];
        if (swapKeys[key(cl.r, cl.c)] && !usedCells[key(cl.r, cl.c)]) return cl;
      }
      var mid = run.cells[Math.floor(run.cells.length / 2)];
      if (!usedCells[key(mid.r, mid.c)]) return mid;
      for (var j = 0; j < run.cells.length; j++) {
        if (!usedCells[key(run.cells[j].r, run.cells[j].c)]) return run.cells[j];
      }
      return null;
    }

    runs.forEach(function (run) {
      var len = run.cells.length;
      var isCross = false;
      for (var i = 0; i < run.cells.length; i++) {
        var cl = run.cells[i];
        if (crosses[key(cl.r, cl.c)] && !usedCells[key(cl.r, cl.c)]) { isCross = true; break; }
      }
      var spot = pickSpot(run);
      if (!spot) return;

      var special = null;
      if (len >= 5 && !isCross) special = 'prism';
      else if (isCross) special = 'crossBomb';
      else if (len === 4) special = 'bomb';

      if (special) {
        usedCells[key(spot.r, spot.c)] = true;
        delete clear[key(spot.r, spot.c)];
        var tile = self.grid[spot.r][spot.c];
        creations.push({ r: spot.r, c: spot.c, special: special, tile: tile });
        createdIds[tile.id] = true;
      }
    });

    // 交叉点上的两个 run 都算 cross；把额外交叉格补为清除格之外的生成点
    for (var k3 in crosses) {
      var cr = crosses[k3];
      if (!usedCells[k3]) {
        // 交叉点已被别的 run 用掉则跳过
        var t = self.grid[cr.r][cr.c];
        if (t && !createdIds[t.id]) {
          usedCells[k3] = true;
          delete clear[k3];
          creations.push({ r: cr.r, c: cr.c, special: 'crossBomb', tile: t });
          createdIds[t.id] = true;
        }
      }
    }

    // 展开特殊棋子的连锁
    var result = this.expandSpecials(clear, createdIds);
    return {
      clearSet: result.clearSet,
      creations: creations,
      createdIds: createdIds,
      triggers: result.triggers,
      runs: runs
    };
  },

  // BFS 触发已存在的特殊棋子（炸弹 / 棱镜）
  expandSpecials: function (clear, createdIds) {
    var self = this;
    var triggers = [];
    var processed = {};
    var queue = [];
    function key(r, c) { return r + ',' + c; }

    for (var k in clear) {
      var cl = clear[k];
      var t = this.grid[cl.r][cl.c];
      if (t && t.special && !createdIds[t.id]) queue.push({ r: cl.r, c: cl.c, tile: t });
    }

    function addBlast(r, c) {
      var t = self.grid[r][c];
      if (!t) return;
      var kk = key(r, c);
      if (t.special && !createdIds[t.id] && !processed[t.id]) {
        queue.push({ r: r, c: c, tile: t });
      }
      if (!clear[kk]) {
        // 新增清除格（石块也可被炸毁）
        clear[kk] = { r: r, c: c };
      }
    }

    while (queue.length) {
      var item = queue.shift();
      var tile = item.tile;
      if (processed[tile.id]) continue;
      processed[tile.id] = true;
      var sp = tile.special;
      triggers.push({ r: item.r, c: item.c, special: sp, tile: tile });

      if (sp === 'bomb') {
        // 炸弹：3×3 范围爆破（可炸毁石块等障碍）
        for (var br = item.r - 1; br <= item.r + 1; br++) {
          for (var bc = item.c - 1; bc <= item.c + 1; bc++) {
            if (br === item.r && bc === item.c) continue;
            if (br >= 0 && br < self.rows && bc >= 0 && bc < self.cols) addBlast(br, bc);
          }
        }
      } else if (sp === 'rowBomb') {
        for (var c2 = 0; c2 < self.cols; c2++) if (c2 !== item.c) addBlast(item.r, c2);
      } else if (sp === 'colBomb') {
        for (var r2 = 0; r2 < self.rows; r2++) if (r2 !== item.r) addBlast(r2, item.c);
      } else if (sp === 'crossBomb') {
        for (var c3 = 0; c3 < self.cols; c3++) if (c3 !== item.c) addBlast(item.r, c3);
        for (var r3 = 0; r3 < self.rows; r3++) if (r3 !== item.r) addBlast(r3, item.c);
      } else if (sp === 'prism') {
        var color = self.mostCommonColor();
        for (var r4 = 0; r4 < self.rows; r4++) {
          for (var c4 = 0; c4 < self.cols; c4++) {
            var t4 = self.grid[r4][c4];
            if (t4 && t4.type === color) addBlast(r4, c4);
          }
        }
      }
    }

    // 石块：相邻清除则碎裂
    var extra = [];
    for (var k5 in clear) {
      var cl5 = clear[k5];
      var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (var d = 0; d < 4; d++) {
        var rr = cl5.r + dirs[d][0], cc = cl5.c + dirs[d][1];
        var st = self.at(rr, cc);
        if (st && st.type === 'stone' && !clear[key(rr, cc)]) extra.push({ r: rr, c: cc });
      }
    }
    extra.forEach(function (e) { clear[key(e.r, e.c)] = e; });

    return { clearSet: clear, triggers: triggers };
  },

  mostCommonColor: function () {
    var counts = [0, 0, 0, 0, 0];
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var t = this.grid[r][c];
        if (t && typeof t.type === 'number') counts[t.type]++;
      }
    }
    var best = 0;
    for (var i = 1; i < 5; i++) if (counts[i] > counts[best]) best = i;
    return best;
  },

  // 棱镜交换：返回需要清除的格子（含棱镜自身）
  prismSwapCells: function (a, b) {
    var ta = this.at(a.r, a.c), tb = this.at(b.r, b.c);
    var clear = {};
    function add(r, c) { clear[r + ',' + c] = { r: r, c: c }; }
    add(a.r, a.c); add(b.r, b.c);
    var color = null;
    if (ta.special === 'prism' && tb.special === 'prism') {
      color = -1;
    } else if (ta.special === 'prism' && tb.special) {
      color = tb.type; // 棱镜 + 炸弹：清该色并引爆炸弹
    } else if (tb.special === 'prism' && ta.special) {
      color = ta.type;
    } else if (ta.special === 'prism') {
      color = tb.type;
    } else {
      color = ta.type;
    }
    if (color === -1) {
      for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) add(r, c);
    } else {
      for (var r2 = 0; r2 < this.rows; r2++) {
        for (var c2 = 0; c2 < this.cols; c2++) {
          var t = this.grid[r2][c2];
          if (t && t.type === color) add(r2, c2);
        }
      }
    }
    return { clear: clear, color: color, bothPrism: color === -1 };
  },

  /* ---------- 特殊棋子组合交换 ----------
     在物理交换之后调用（a 的棋子已落在 b，b 的棋子已落在 a）。
     返回 { clear, fxTriggers, kind, tiles }，由 Battle 包装成波次。 */
  comboSwapClear: function (a, b) {
    var ta = this.grid[b.r][b.c]; // 拖动方棋子（现位于 b）
    var tb = this.grid[a.r][a.c]; // 目标方棋子（现位于 a）
    var spA = ta ? ta.special : null;   // 拖动方特殊类型
    var spB = tb ? tb.special : null;   // 目标方特殊类型
    var self = this;
    var clear = {};
    var fxTriggers = [];
    var kind = '';
    var color = -1;

    function key(r, c) { return r + ',' + c; }
    function add(r, c) {
      if (r < 0 || r >= self.rows || c < 0 || c >= self.cols) return;
      var k = key(r, c);
      if (!clear[k]) clear[k] = { r: r, c: c };
    }
    function blast3x3(r, c) {
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) add(r + dr, c + dc);
    }
    function blast5x5(r, c) {
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) add(r + dr, c + dc);
    }
    function blastRowCol(r, c) {
      for (var i = 0; i < self.cols; i++) add(r, i);
      for (var i2 = 0; i2 < self.rows; i2++) add(i2, c);
    }
    function eachColor(cl, fn) {
      for (var r = 0; r < self.rows; r++) {
        for (var c = 0; c < self.cols; c++) {
          var t = self.grid[r][c];
          if (t && t.type === cl) fn(r, c);
        }
      }
    }
    function fx(r, c, special) {
      if (fxTriggers.length < 10) fxTriggers.push({ r: r, c: c, special: special, tile: null });
    }

    // 两个被交换的特殊棋子自身必定消耗
    add(b.r, b.c);
    add(a.r, a.c);

    var hasPrism = spA === 'prism' || spB === 'prism';
    var other = spA === 'prism' ? tb : ta; // 棱镜之外的那个棋子（用于取颜色）

    if (hasPrism && spA === 'prism' && spB === 'prism') {
      // 棱镜 + 棱镜：全场清除
      kind = 'prismAll';
      for (var r1 = 0; r1 < this.rows; r1++) for (var c1 = 0; c1 < this.cols; c1++) add(r1, c1);
      fx(b.r, b.c, 'megaBomb');
    } else if (hasPrism && (spA === 'bomb' || spB === 'bomb')) {
      // 棱镜 + 炸弹：该颜色棋子全部化为炸弹并引爆（各炸 3×3）
      kind = 'prismBombs';
      color = other ? other.type : 0;
      eachColor(color, function (r, c) {
        blast3x3(r, c);
        fx(r, c, 'bomb');
      });
    } else if (hasPrism && (spA === 'crossBomb' || spB === 'crossBomb')) {
      // 棱镜 + 十字雷：该颜色棋子全部化为十字雷并引爆（各行各列）
      kind = 'prismCross';
      color = other ? other.type : 0;
      eachColor(color, function (r, c) {
        blastRowCol(r, c);
        fx(r, c, 'crossBomb');
      });
    } else if (spA === 'bomb' && spB === 'bomb') {
      // 炸弹 + 炸弹：扩大为 5×5 超级爆炸
      kind = 'bombBomb';
      blast5x5(b.r, b.c);
      fx(b.r, b.c, 'megaBomb');
    } else if ((spA === 'bomb' && spB === 'crossBomb') || (spA === 'crossBomb' && spB === 'bomb')) {
      // 炸弹 + 十字雷：交叉爆炸（行 + 列 + 爆心 3×3）
      kind = 'bombCross';
      blastRowCol(b.r, b.c);
      blast3x3(b.r, b.c);
      blast3x3(a.r, a.c);
      fx(b.r, b.c, 'bombCross');
    } else {
      // 十字雷 + 十字雷：双重十字（双方所在行列全清）
      kind = 'crossCross';
      blastRowCol(b.r, b.c);
      blastRowCol(a.r, a.c);
      fx(b.r, b.c, 'bombCross');
      fx(a.r, a.c, 'bombCross');
    }

    return { clear: clear, fxTriggers: fxTriggers, kind: kind, color: color, tiles: [ta, tb] };
  },

  /* ---------- 重力与补子 ---------- */
  gravity: function () {
    var falls = [], spawns = [];
    for (var c = 0; c < this.cols; c++) {
      var tiles = [];
      for (var r = 0; r < this.rows; r++) {
        if (this.grid[r][c]) tiles.push(this.grid[r][c]);
        this.grid[r][c] = null;
      }
      var idx = this.rows - 1;
      for (var i = tiles.length - 1; i >= 0; i--) {
        var t = tiles[i];
        if (t.r !== idx) { falls.push({ tile: t, fromR: t.r, toR: idx }); t.r = idx; }
        this.grid[idx][c] = t;
        idx--;
      }
      for (var r2 = idx; r2 >= 0; r2--) {
        var type = this.spawnType(r2, c);
        var nt = this.makeTile(type, r2, c);
        this.grid[r2][c] = nt;
        spawns.push({ r: r2, c: c, tile: nt });
      }
    }
    return { falls: falls, spawns: spawns };
  },

  spawnType: function (r, c) {
    // 教程脚本补子
    if (this.tutorial && this.scriptRefill[c] && this.scriptRefill[c].length) {
      var k = this.scriptRefill[c].shift();
      return KEY_TO_TYPE[k];
    }
    var g = this.grid;
    function same(r, c) {
      var t = (r >= 0 && r < g.length && c >= 0 && c < g[0].length) ? g[r][c] : null;
      return (t && typeof t.type === 'number') ? t.type : null;
    }
    var order = [];
    for (var i = 0; i < CONFIG.COLORS; i++) order.push(i);
    for (var j = order.length - 1; j > 0; j--) {
      var jj = Math.floor(this.rng() * (j + 1));
      var tmp = order[j]; order[j] = order[jj]; order[jj] = tmp;
    }
    for (var x = 0; x < order.length; x++) {
      var t = order[x];
      if (same(r + 1, c) === t && same(r + 2, c) === t) continue;
      if (same(r - 1, c) === t && same(r - 2, c) === t) continue;
      if (same(r, c - 1) === t && same(r, c - 2) === t) continue;
      if (same(r, c + 1) === t && same(r, c + 2) === t) continue;
      if (same(r, c - 1) === t && same(r, c + 1) === t) continue;
      return t;
    }
    return order[0];
  },

  /* ---------- 提示 / 可行步 ---------- */
  hasValidMove: function () {
    return this.findHint() !== null;
  },

  findHint: function () {
    var best = null, bestScore = -1;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var dirs = [[0, 1], [1, 0]];
        for (var d = 0; d < 2; d++) {
          var a = { r: r, c: c };
          var b = { r: r + dirs[d][0], c: c + dirs[d][1] };
          if (!this.canSwap(a, b)) continue;
          var ta = this.at(a.r, a.c), tb = this.at(b.r, b.c);
          var score = 0, info = '';
          if (ta.special === 'prism' && tb.special === 'prism') { score = 200; info = 'prism2'; }
          else if (ta.special && tb.special) { score = 170; info = 'combo'; }
          else if (ta.special === 'prism' || tb.special === 'prism') { score = 120; info = 'prism'; }
          else {
            this.swapTiles(a, b);
            var runs = this.findRuns();
            this.swapTiles(a, b);
            if (!runs.length) continue;
            var cells = 0, len4 = 0;
            runs.forEach(function (run) {
              cells += run.cells.length;
              if (run.cells.length >= 4) len4++;
            });
            score = cells + len4 * 10 + (runs.length > 1 ? 6 : 0);
            info = len4 ? 'special' : 'match';
          }
          if (score > bestScore) {
            bestScore = score;
            best = { a: a, b: b, score: score, info: info };
          }
        }
      }
    }
    return best;
  },

  // 教程用：寻找能形成 4 连（优先）或交叉的交换
  findSpecialSwap: function () {
    var crossFallback = null;
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        var dirs = [[1, 0], [0, 1]];
        for (var d = 0; d < 2; d++) {
          var a = { r: r, c: c };
          var b = { r: r + dirs[d][0], c: c + dirs[d][1] };
          if (!this.canSwap(a, b)) continue;
          this.swapTiles(a, b);
          var runs = this.findRuns();
          this.swapTiles(a, b);
          var has4 = runs.some(function (run) { return run.cells.length >= 4; });
          if (has4) return { a: a, b: b, info: 'special' };
          // 交叉检测
          var cellCount = {};
          runs.forEach(function (run) {
            run.cells.forEach(function (cl) { var k = cl.r + ',' + cl.c; cellCount[k] = (cellCount[k] || 0) + 1; });
          });
          var cross = false;
          for (var k in cellCount) if (cellCount[k] >= 2) cross = true;
          if (cross && !crossFallback) crossFallback = { a: a, b: b, info: 'cross' };
        }
      }
    }
    return crossFallback;
  },

  // 死局检测：无可行步则重排
  shuffleBoard: function () {
    var tiles = [];
    for (var r = 0; r < this.rows; r++) {
      for (var c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) { tiles.push(this.grid[r][c]); this.grid[r][c] = null; }
      }
    }
    var guard = 0;
    do {
      for (var i = tiles.length - 1; i > 0; i--) {
        var j = Math.floor(this.rng() * (i + 1));
        var tmp = tiles[i]; tiles[i] = tiles[j]; tiles[j] = tmp;
      }
      var idx = 0;
      for (var r2 = 0; r2 < this.rows; r2++) {
        for (var c2 = 0; c2 < this.cols; c2++) {
          var t = tiles[idx++];
          t.r = r2; t.c = c2;
          this.grid[r2][c2] = t;
        }
      }
      guard++;
    } while ((this.findRuns().length > 0 || !this.hasValidMove()) && guard < 60);
    return this.hasValidMove();
  },

  tileCount: function () {
    var n = 0;
    for (var r = 0; r < this.rows; r++) for (var c = 0; c < this.cols; c++) if (this.grid[r][c]) n++;
    return n;
  }
};

export { Board };
