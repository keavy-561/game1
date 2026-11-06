/* ==========================================================
   UI 渲染器：DOM / 动画 / 引导 / 界面流转
   ========================================================== */
var UI = (function () {

  var $ = function (id) { return document.getElementById(id); };

  var M = {
    screenTitle: null, screenMap: null, screenBattle: null,
    board: null, boardWrap: null, monsters: null, heroes: null,
    cell: 56, battle: null, level: null,
    selected: null, dragInfo: null,
    fxRoot: null, guide: null,
    hintTimer: null, idleTimer: null,
    teamIntroAfter: null,
    listeners: {}
  };

  /* ============ 初始化 ============ */
  function init() {
    M.screenTitle = $('screen-title'); M.screenMap = $('screen-map'); M.screenBattle = $('screen-battle');
    M.board = $('board'); M.boardWrap = $('board-wrap');
    M.monsters = $('monsters'); M.heroes = $('heroes');
    M.fxRoot = M.screenBattle;

    $('title-logo').innerHTML = SVG.logo();
    // 静态 data-ic 图标装饰（护盾徽章 / 规则图标）
    Array.prototype.forEach.call(document.querySelectorAll('[data-ic]'), function (n) {
      n.innerHTML = SVG.icon(n.getAttribute('data-ic'));
    });
    $('btn-start').addEventListener('click', function () {
      AudioFX.init(); AudioFX.play('select');
      onStartGame();
    });
    $('btn-map-from-title').addEventListener('click', function () { AudioFX.init(); AudioFX.play('select'); showMap(); });
    $('btn-back-title').addEventListener('click', function () { AudioFX.play('select'); showTitle(); });
    $('btn-pause').innerHTML = SVG.icon('pause');
    $('btn-buffs').innerHTML = SVG.icon('sparkle');
    $('btn-pause').addEventListener('click', function () {
      AudioFX.play('select');
      pauseBattle();
    });
    $('btn-resume').addEventListener('click', function () {
      AudioFX.play('select');
      hideOverlay('overlay-pause');
      if (M.battle && !M.battle.busy && !M.battle.over) lockBoard(false);
    });
    $('btn-retry').addEventListener('click', function () {
      AudioFX.play('select');
      hideOverlay('overlay-pause');
      if (M.battle) startBattle(M.battle.n);
    });
    $('btn-quit-battle').addEventListener('click', function () {
      AudioFX.play('select');
      hideOverlay('overlay-pause');
      quitBattle();
    });
    $('btn-sound-pause').addEventListener('click', function () {
      AudioFX.init();
      AudioFX.enabled = !AudioFX.enabled;
      DATA.save.sound = AudioFX.enabled;
      DATA.persist();
      refreshSoundButtons();
      AudioFX.play('select');
    });
    $('btn-hint').addEventListener('click', function () { doHint(); });
    $('btn-buffs').addEventListener('click', function () { AudioFX.play('select'); showBuffsOverlay(); });
    $('btn-buffs-close').addEventListener('click', function () { hideOverlay('overlay-buffs'); });
    $('btn-monster-close').addEventListener('click', function () { hideOverlay('overlay-monster'); });
    $('btn-prism-cancel').addEventListener('click', function () {
      AudioFX.play('select');
      hideOverlay('overlay-prism');
      M.prismCell = null;
    });
    $('overlay-prism').addEventListener('click', function (e) {
      if (e.target === this) { hideOverlay('overlay-prism'); M.prismCell = null; }
    });
    $('btn-team-go').addEventListener('click', function () {
      AudioFX.init(); AudioFX.play('select');
      hideOverlay('overlay-team');
      teamIntroDismissed();
    });
    $('overlay-team').addEventListener('click', function (e) {
      if (e.target === this) { hideOverlay('overlay-team'); teamIntroDismissed(); }
    });
    $('btn-chapter-go').addEventListener('click', function () {
      hideOverlay('overlay-chapter');
      if (M.pendingBattle) { M.pendingBattle(); M.pendingBattle = null; }
    });
    $('btn-save-io').addEventListener('click', function () { AudioFX.init(); AudioFX.play('select'); openSaveIO(); });
    $('btn-save-close').addEventListener('click', function () { AudioFX.play('select'); hideOverlay('overlay-save'); });
    $('btn-save-copy').addEventListener('click', function () { AudioFX.init(); copySaveCode(); });
    $('btn-save-import').addEventListener('click', function () { AudioFX.init(); importSave(); });
    $('overlay-save').addEventListener('click', function (e) {
      if (e.target === this) hideOverlay('overlay-save');
    });
    $('btn-reset').addEventListener('click', function () { AudioFX.play('select'); openResetConfirm(); });
    $('btn-reset-cancel').addEventListener('click', function () {
      AudioFX.play('select');
      hideOverlay('overlay-reset');
    });
    $('btn-reset-ok').addEventListener('click', function () {
      AudioFX.play('select');
      DATA.resetProgress();
      hideOverlay('overlay-reset');
      refreshTitleProgress();
      toast('已重新开始，进度已清空', 2400);
    });
    $('overlay-reset').addEventListener('click', function (e) {
      if (e.target === this) hideOverlay('overlay-reset');
    });
    bindSoundButtons();
    buildBackgroundDeco(0);

    // 输入
    bindBoardInput();
    window.addEventListener('resize', onResize);
  }

  function refreshSoundButtons() {
    ['btn-sound-title', 'btn-sound-map', 'btn-sound-battle'].forEach(function (id) {
      $(id).innerHTML = SVG.icon(AudioFX.enabled ? 'sound' : 'soundOff');
    });
    $('btn-sound-pause').textContent = '音效：' + (AudioFX.enabled ? '开' : '关');
  }

  function bindSoundButtons() {
    ['btn-sound-title', 'btn-sound-map', 'btn-sound-battle'].forEach(function (id) {
      $(id).addEventListener('click', function () {
        AudioFX.init();
        AudioFX.enabled = !AudioFX.enabled;
        DATA.save.sound = AudioFX.enabled;
        DATA.persist();
        refreshSoundButtons();
        AudioFX.play('select');
      });
    });
    AudioFX.enabled = DATA.save.sound !== false;
    refreshSoundButtons();
  }

  /* ============ 屏幕切换 ============ */
  function showScreen(name) {
    M.screenTitle.classList.add('hidden');
    M.screenMap.classList.add('hidden');
    M.screenBattle.classList.add('hidden');
    if (name === 'title') M.screenTitle.classList.remove('hidden');
    if (name === 'map') M.screenMap.classList.remove('hidden');
    if (name === 'battle') M.screenBattle.classList.remove('hidden');
  }

  function showTitle() { showScreen('title'); refreshTitleProgress(); }

  /* ============ 标题屏：进度提示（设备存档自动恢复的可视化） ============ */
  function refreshTitleProgress() {
    var chip = $('title-progress');
    var btn = $('btn-start');
    if (!chip || !btn) return;
    var save = DATA.save;
    var starCount = 0;
    for (var k in save.stars) { if (save.stars[k]) starCount += save.stars[k]; }
    if (save.unlocked > 1 || starCount > 0) {
      chip.textContent = '已远征至第 ' + save.unlocked + ' 关' + (starCount ? ' · ★ ' + starCount : '');
      chip.classList.remove('hidden');
      btn.textContent = '继续远征';
    } else {
      chip.classList.add('hidden');
      btn.textContent = '开始探索';
    }
  }

  function openResetConfirm() {
    var el = $('reset-device-code');
    if (el) el.textContent = '设备码 ' + DATA.getDeviceCode();
    $('overlay-reset').classList.remove('hidden');
  }

  function onStartGame() {
    var save = DATA.save;
    if (save.unlocked <= 1 && !save.stars[1]) {
      startBattle(1);
    } else {
      showMap();
    }
  }

  /* ============ 背景装饰 ============ */
  function buildBackgroundDeco(chapter) {
    var root = $('bg-deco');
    U.clearEl(root);
    var glyphs = [SVG.glyph(0), SVG.glyph(1), SVG.glyph(2), SVG.glyph(3), SVG.glyph(4)];
    for (var i = 0; i < 14; i++) {
      var d = U.div('deco', root);
      var size = 14 + Math.random() * 26;
      d.style.width = size + 'px';
      d.style.height = size + 'px';
      d.style.left = (Math.random() * 100) + '%';
      d.style.top = (Math.random() * 100) + '%';
      d.style.opacity = (0.18 + Math.random() * 0.25).toFixed(2);
      d.style.animationDuration = (6 + Math.random() * 8) + 's';
      d.style.animationDelay = (-Math.random() * 8) + 's';
      d.innerHTML = glyphs[Math.floor(Math.random() * 5)];
    }
    var theme = ['#FBF3E2', '#EFF3E0', '#E8F0F7', '#EDEAF4', '#F0EDE6', '#F7ECEA'][chapter] || '#FBF3E2';
    document.body.style.background = theme;
  }

  /* ============ 关卡地图 ============ */
  function showMap() {
    showScreen('map');
    var save = DATA.save;
    var scroll = $('map-scroll');
    U.clearEl(scroll);

    var chIcons = ['petalIc', 'leafIc', 'dropIc', 'moonIc', 'sparkle', 'crown'];

    for (var ch = 0; ch < 6; ch++) {
      var block = U.div('chapter-block', scroll);
      var head = U.div('chapter-head', block);
      var ic = U.div('ch-ic', head);
      ic.innerHTML = SVG.icon(chIcons[ch], DATA.COLOR_INFO[[0, 2, 1, 4, 3, 0][ch]].hex);
      var h3 = document.createElement('h3'); h3.textContent = DATA.CHAPTERS[ch].name; head.appendChild(h3);
      U.div('ch-line', head);

      var row = U.div('level-row', block);
      for (var i = 1; i <= 10; i++) {
        var n = ch * 10 + i;
        var node = U.div('level-node', row);
        if (n % 10 === 0) node.classList.add('boss');
        if (n > save.unlocked) { node.classList.add('locked'); node.innerHTML = SVG.icon('lock'); }
        else {
          var num = U.div('lv-num', node);
          num.textContent = n;
          var stars = save.stars[n] || 0;
          var st = U.div('lv-stars', node);
          for (var s = 0; s < 3; s++) {
            var sv = U.div(null, st);
            sv.innerHTML = s < stars ? SVG.icon('starFill') : SVG.icon('starEmpty');
          }
          if (save.run && save.run.level === n) U.div('run-chip', node).textContent = '远征中';
          if (n === save.unlocked && !(save.stars[n] >= 1)) node.classList.add('current');
        }
        (function (lv) {
          node.addEventListener('click', function () {
            AudioFX.init(); AudioFX.play('select');
            startBattle(lv);
          });
        })(n);
      }
    }
    // 滚到当前进度
    var cur = scroll.querySelector('.current') || scroll.querySelector('.level-node:not(.locked)');
    if (cur) setTimeout(function () { cur.scrollIntoView({ block: 'center' }); }, 50);
  }

  /* ============ 战斗构建 ============ */
  function startBattle(n) {
    // 关闭所有覆盖层
    ['overlay-result', 'overlay-bless', 'overlay-monster', 'overlay-buffs', 'overlay-team', 'overlay-chapter', 'overlay-prism', 'overlay-pause', 'overlay-save'].forEach(function (id) {
      $(id).classList.add('hidden');
    });
    clearTimeout(M.comboTimer);
    clearTimeout(M.hintTimer);
    // 关键修复：废弃上一场战斗的异步流程（暂停菜单里重开/退出时可能仍在跑动画），
    // 否则旧流程的 finally 会解锁新战斗的棋盘、或对已置空的 M.battle 触发空引用
    if (M.battle && !M.battle.over) { M.battle.over = true; M.battle.busy = true; }
    // 关键修复：清掉上一场战斗残留的锁定与选中态，否则换关后棋盘无法操作
    M.selected = null;
    M.dragInfo = null;
    M.board.classList.remove('locked');
    var comboEl = $('combo-pop');
    if (comboEl) comboEl.classList.add('hidden');

    var level = DATA.buildLevel(n);
    var save = DATA.save;
    var runState = (save.run && save.run.level === n) ? save.run : null;

    M.level = level;
    M.battle = new Battle(level, runState);
    M.battle.ui = UI;

    showScreen('battle');
    buildBackgroundDeco(level.chapter);
    buildBattleDOM(M.battle);
    AudioFX.bgmSetTheme(level.chapter);

    var go = function () {
      M.battle.start(UI);
      if (level.tutorial) Guide.begin(M.battle);
      else Guide.stop();
      resetIdleTimer();
      // 首次进入非教程战斗：先展示队伍技能一览，关掉面板后再弹一次性小知识
      var tips = function () { oneTimeTips(level.n); };
      if (!level.tutorial && maybeShowTeamIntro()) { M.teamIntroAfter = tips; return; }
      tips();
    };

    // 章节过场
    if (n % 10 === 1 && !save.stars[n]) {
      M.pendingBattle = go;
      $('chapter-ic').innerHTML = SVG.monster(DATA.CHAPTERS[level.chapter].pool[0] === 'roseking' ? 'roseking' : DATA.CHAPTERS[level.chapter].pool[0]);
      $('chapter-name').textContent = DATA.CHAPTERS[level.chapter].name;
      $('chapter-sub').textContent = DATA.CHAPTERS[level.chapter].sub + ' · 第 ' + n + ' 关';
      $('overlay-chapter').classList.remove('hidden');
    } else {
      go();
    }
  }

  // 一次性小知识提示
  function oneTimeTips(n) {
    var save = DATA.save;
    if (n === 2 && !save.tips.weak) {
      save.tips.weak = 1; DATA.persist();
      setTimeout(function () { toast('小提示：怪物卡片上有弱点标记，用对应颜色攻击更痛！', 3000); }, 1200);
    }
    if (n === 3 && !save.tips.lane) {
      save.tips.lane = 1; DATA.persist();
      setTimeout(function () { toast('小提示：棋子在哪一列，就会攻击那一列的怪物！', 3000); }, 1200);
    }
    if (n === 5 && !save.tips.wave) {
      save.tips.wave = 1; DATA.persist();
      setTimeout(function () { toast('新机制：怪物会分波登场！击败一整波 +3 步，最终波有超级 BOSS！', 3800); }, 1200);
    }
    if (n === 6 && !save.tips.heroHp) {
      save.tips.heroHp = 1; DATA.persist();
      setTimeout(function () { toast('小提示：怪物优先攻击能量最高的英雄，血量归零会晕厥——及时放技能、留好治疗！', 3800); }, 1200);
    }
    if (n === 10 && !save.tips.boss) {
      save.tips.boss = 1; DATA.persist();
      setTimeout(function () { toast('章节 BOSS 关：本章之王坐镇最终波，蓄好技能与炸弹迎接它！', 3800); }, 1200);
    }
    if (n >= 17 && !save.tips.seal) {
      save.tips.seal = 1; DATA.persist();
      setTimeout(function () { toast('新机制：封印元素！目标栏标出的颜色被压制——消除它不造成伤害、不积攒能量，但照常消耗步数、怪物照常行动！', 4200); }, 1200);
    }
  }

  /* ============ 远征队伍：首次进入非教程战斗时展示技能一览 ============ */
  function maybeShowTeamIntro() {
    var save = DATA.save;
    if (save.tips.teamIntro) return false;
    save.tips.teamIntro = 1;
    DATA.persist();
    var list = $('team-list');
    U.clearEl(list);
    DATA.HEROES.forEach(function (h) {
      var row = U.div('team-row', list);
      var face = U.div('team-face', row);
      face.innerHTML = SVG.hero(h.id);
      var tx = U.div('team-tx', row);
      var b = U.el('b', null, tx);
      b.textContent = h.name + ' · ' + h.title;
      var i = U.el('i', null, tx);
      i.textContent = h.skill;
      i.style.color = DATA.COLOR_INFO[h.color].hex;
      var em = U.el('em', null, tx);
      em.textContent = h.skillDesc;
    });
    $('overlay-team').classList.remove('hidden');
    return true;
  }
  function teamIntroDismissed() {
    if (M.teamIntroAfter) { var cb = M.teamIntroAfter; M.teamIntroAfter = null; cb(); }
  }

  function quitBattle() {
    // 保留远征进度（save.run 指向当前关）
    clearTimeout(M.hintTimer); clearTimeout(M.idleTimer);
    Guide.stop();
    // 废弃仍在跑的异步流程，防止退出后旧流程继续结算/解锁
    if (M.battle && !M.battle.over) { M.battle.over = true; M.battle.busy = true; }
    M.battle = null;
    ['overlay-result', 'overlay-bless', 'overlay-monster', 'overlay-buffs', 'overlay-team', 'overlay-chapter', 'overlay-prism', 'overlay-pause', 'overlay-save'].forEach(function (id) {
      $(id).classList.add('hidden');
    });
    showMap();
  }

  /* ============ 暂停 ============ */
  function pauseBattle() {
    if (!M.battle || M.battle.over) return;
    lockBoard(true);
    $('overlay-pause').classList.remove('hidden');
  }

  function buildBattleDOM(battle) {
    var level = battle.level;
    $('hud-chapter').textContent = DATA.CHAPTERS[level.chapter].name;
    $('hud-level').textContent = '第 ' + level.n + ' 关';
    $('moves-num').textContent = battle.movesLeft;
    $('hud-moves').classList.remove('low');

    // 目标
    var om = $('objective-mini');
    U.clearEl(om);
    level.objectives.forEach(function (key) {
      var def = DATA.OBJECTIVES[key];
      var row = U.div('obj', om);
      row.innerHTML = SVG.icon(def.icon) + '<span>' + def.desc + '</span>';
      row.dataset.key = key;
    });
    // 封印元素徽章：本关被压制的颜色（消除无伤害、无能量）
    var seals = level.sealed || [];
    if (seals.length) {
      var sealRow = U.div('obj obj-seal', om);
      var sealGlyphs = '';
      seals.forEach(function (ci) { sealGlyphs += '<span class="seal-g">' + SVG.glyph(ci) + '</span>'; });
      sealRow.innerHTML = SVG.icon('curse') + sealGlyphs + '<span>封印 · 消除无效</span>';
    }

    updateHp();
    updateShield();
    renderMonsters(battle, true);
    renderHeroes(battle);
    renderBoard(battle);
    updateEnergy();
    updateObjectives(battle);
    updateWaveChip(battle);
    updateBattleTip();
  }

  function onResize() {
    if (!M.battle) return;
    layoutBoard();
    positionAllTiles();
  }

  function layoutBoard() {
    var b = M.battle.board;
    var availW = Math.min(window.innerWidth - 14, 460);
    // 动态测量除棋盘外的固定区域高度
    var chrome = 0;
    ['.hud', '.hud-objective', '.monsters', '.team-strip', '.heroes', '.battle-foot'].forEach(function (sel) {
      var e = document.querySelector(sel);
      if (e) chrome += e.getBoundingClientRect().height;
    });
    chrome += 12;
    var availH = window.innerHeight - chrome;
    var cell = Math.floor(Math.min(availW / b.cols, availH / b.rows));
    // 怪物精灵随 cell 变大而变高：预留增长量（最大精灵高系数 1.75 + 富余），防止设置后底部溢出
    if (cell > M.cell) {
      cell = Math.floor(Math.min(availW / b.cols, (availH - (cell - M.cell) * 1.8) / b.rows));
    }
    cell = U.clamp(cell, 30, 68);
    M.cell = cell;
    M.board.style.width = (cell * b.cols) + 'px';
    M.board.style.height = (cell * b.rows) + 'px';
    M.board.style.setProperty('--cell', cell + 'px');
    // 怪物精灵等棋盘外元素也要按格子缩放：挂到整个战斗屏
    M.screenBattle.style.setProperty('--cell', cell + 'px');
    // 怪物行与棋盘同宽同列数，保证攻击路线对齐
    M.monsters.style.width = (cell * b.cols + 6) + 'px';
    M.monsters.style.gridTemplateColumns = 'repeat(' + b.cols + ', 1fr)';
  }

  /* ============ 棋子渲染 ============ */
  function renderBoard(battle) {
    layoutBoard();
    U.clearEl(M.board);
    var b = battle.board;
    for (var r = 0; r < b.rows; r++) {
      for (var c = 0; c < b.cols; c++) {
        var tile = b.grid[r][c];
        if (tile) makeTileEl(tile);
      }
    }
    // 入场动画：整列下落感
    var tiles = M.board.querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      var el = tiles[i];
      el.style.opacity = '0';
      (function (el, i) {
        setTimeout(function () {
          el.style.opacity = '1';
          el.classList.add('spawn');
          setTimeout(function () { el.classList.remove('spawn'); }, 350);
        }, i * 6);
      })(el, i);
    }
  }

  function tileInnerHTML(tile) {
    if (tile.type === 'stone') return '<div class="glyph">' + SVG.stone() + '</div>';
    if (tile.special === 'prism') return '<div class="glyph">' + SVG.prismGem() + '</div><div class="tile-badge"></div>';
    return '<div class="glyph">' + SVG.glyph(tile.type) + '</div>' +
      (tile.special ? '<div class="tile-badge"></div>' : '');
  }

  function makeTileEl(tile) {
    var sealCls = '';
    if (M.battle && M.battle.level && M.battle.level.sealed && typeof tile.type === 'number' &&
      M.battle.level.sealed.indexOf(tile.type) >= 0) sealCls = ' sealed';
    var el = U.div('tile' + (tile.type === 'stone' ? ' stone' : '') + (tile.special ? ' special ' + tile.special : '') + sealCls, M.board);
    el.innerHTML = '<div class="tile-inner">' + tileInnerHTML(tile) + '</div>';
    tile.el = el;
    el.dataset.id = tile.id;
    positionTile(el, tile.r, tile.c);
    return el;
  }

  function positionTile(el, r, c) {
    el.style.transform = 'translate(' + (c * M.cell) + 'px,' + (r * M.cell) + 'px)';
  }

  function positionAllTiles() {
    var b = M.battle.board;
    for (var r = 0; r < b.rows; r++) {
      for (var c = 0; c < b.cols; c++) {
        var t = b.grid[r][c];
        if (t && t.el) positionTile(t.el, r, c);
      }
    }
  }

  function cellCenter(r, c) {
    var br = M.board.getBoundingClientRect();
    var sr = M.screenBattle.getBoundingClientRect();
    return {
      x: br.left - sr.left + (c + 0.5) * M.cell,
      y: br.top - sr.top + (r + 0.5) * M.cell
    };
  }

  /* ============ 棋盘输入 ============ */
  function bindBoardInput() {
    function posToCell(e) {
      var br = M.board.getBoundingClientRect();
      var x = e.clientX - br.left, y = e.clientY - br.top;
      var c = Math.floor(x / M.cell), r = Math.floor(y / M.cell);
      var b = M.battle.board;
      if (c < 0 || c >= b.cols || r < 0 || r >= b.rows) return null;
      return { r: r, c: c };
    }

    M.board.addEventListener('pointerdown', function (e) {
      if (!M.battle || M.battle.busy || M.battle.over) return;
      var cell = posToCell(e);
      if (!cell) return;
      var tile = M.battle.board.at(cell.r, cell.c);
      if (!tile || M.battle.board.isStone(tile)) { clearSelect(); return; }
      M.dragInfo = { r: cell.r, c: cell.c, x: e.clientX, y: e.clientY, done: false };
      resetIdleTimer();
      e.preventDefault();
    });

    window.addEventListener('pointermove', function (e) {
      if (!M.dragInfo || M.dragInfo.done || !M.battle || M.battle.busy) return;
      var dx = e.clientX - M.dragInfo.x, dy = e.clientY - M.dragInfo.y;
      if (Math.abs(dx) < M.cell * 0.42 && Math.abs(dy) < M.cell * 0.42) return;
      var dir;
      if (Math.abs(dx) > Math.abs(dy)) dir = [0, dx > 0 ? 1 : -1];
      else dir = [dy > 0 ? 1 : -1, 0];
      M.dragInfo.done = true;
      clearSelect();
      var a = { r: M.dragInfo.r, c: M.dragInfo.c };
      var b = { r: a.r + dir[0], c: a.c + dir[1] };
      M.battle.trySwap(a, b);
    });

    window.addEventListener('pointerup', function (e) {
      if (!M.dragInfo || M.dragInfo.done || !M.battle) return;
      // 点击（未拖动）
      var br = M.board.getBoundingClientRect();
      var x = e.clientX - br.left, y = e.clientY - br.top;
      var c = Math.floor(x / M.cell), r = Math.floor(y / M.cell);
      M.dragInfo = null;
      var bb = M.battle.board;
      if (c < 0 || c >= bb.cols || r < 0 || r >= bb.rows) return;
      var cell = { r: r, c: c };
      var tile = M.battle.board.at(r, c);
      if (!tile) return;
      if (M.selected) {
        var s = M.selected;
        if (s.r === r && s.c === c) { clearSelect(); return; }
        if (Math.abs(s.r - r) + Math.abs(s.c - c) === 1) {
          clearSelect();
          M.battle.trySwap(s, cell);
          return;
        }
      }
      // 彩虹核心：点击（非拖动）打开颜色选择
      if (tile.special === 'prism') {
        clearSelect();
        openPrismPicker(cell);
        return;
      }
      // 选中
      clearSelect();
      M.selected = cell;
      tile.el.classList.add('selected');
      AudioFX.play('select');
    });
  }

  /* ============ 彩虹核心颜色选择 ============ */
  function openPrismPicker(cell) {
    if (!M.battle || M.battle.busy || M.battle.over) return;
    var tile = M.battle.board.at(cell.r, cell.c);
    if (!tile || tile.special !== 'prism') return;
    M.prismCell = cell;
    AudioFX.play('select');
    var box = $('prism-colors');
    U.clearEl(box);
    DATA.COLOR_INFO.forEach(function (info, i) {
      var btn = U.el('button', 'prism-color', box);
      btn.innerHTML = '<span class="pc-glyph">' + SVG.glyph(i) + '</span><span class="pc-name">' + info.cn + '</span>';
      btn.addEventListener('click', function () {
        AudioFX.play('select');
        hideOverlay('overlay-prism');
        M.prismCell = null;
        if (M.battle) M.battle.activatePrism(cell.r, cell.c, i);
      });
    });
    $('overlay-prism').classList.remove('hidden');
  }

  function clearSelect() {
    if (M.selected) {
      var t = M.battle ? M.battle.board.at(M.selected.r, M.selected.c) : null;
      if (t && t.el) t.el.classList.remove('selected');
    }
    M.selected = null;
  }

  function lockBoard(lock) {
    M.board.classList.toggle('locked', lock);
    if (lock) clearSelect();
  }

  /* ============ 怪物渲染 ============ */
  function renderMonsters(battle, spawnAnim) {
    U.clearEl(M.monsters);
    battle.monsters.forEach(function (m) {
      var el = U.div('monster wide-' + m.size + (m.alive ? '' : ' dead-slot') + (m.isElite ? ' elite' : ''), M.monsters);
      el.style.gridColumn = (m.cols[0] + 1) + ' / span ' + m.size;
      if (spawnAnim) {
        el.classList.add('spawn-in');
        (function (e) { setTimeout(function () { e.classList.remove('spawn-in'); }, 620); })(el);
      }
      var card = U.div('m-card', el);
      var sprite = U.div('m-sprite', card);
      sprite.innerHTML = SVG.monster(m.family, { tint: m.tint });
      var name = U.div('m-name', card);
      name.textContent = m.name + (m.isBoss ? ' · 王' : '');
      var hp = U.div('m-hp', card);
      var hpGhost = U.div('m-hp-ghost', hp);
      var hpFill = U.div('m-hp-fill', hp);
      var hpText = U.div('m-hp-text', hp);
      var weak = U.div('m-weak', card);
      var wIc = U.div('wk w', weak);
      wIc.innerHTML = SVG.glyph(m.weak) + '<span>弱</span>';
      if (m.resist >= 0 && m.resist !== m.weak) {
        var rIc = U.div('wk s', weak);
        rIc.innerHTML = SVG.glyph(m.resist) + '<span>抗</span>';
      }
      var tele = U.div('m-telegraph', el);
      m.el = el; m.card = card; m.spriteEl = sprite; m.hpFill = hpFill; m.hpGhost = hpGhost; m.hpText = hpText; m.teleEl = tele;
      updateMonsterHp(m);
      updateTelegraph(m);
      updateFrozen(m);
      updateMonsterShield(m);
      el.addEventListener('click', function () {
        if (m.alive) showMonsterDetail(m);
      });
    });
  }

  function updateMonsterHp(m) {
    if (!m.hpFill) return;
    var pct = U.clamp(m.hp / m.hpMax, 0, 1) * 100;
    m.hpFill.style.width = pct + '%';
    if (m.hpText) m.hpText.textContent = Math.max(0, Math.round(m.hp)) + '/' + m.hpMax;
    if (m.hpGhost) {
      // 延迟收缩的残影血条：直观展示本次掉了多少血
      clearTimeout(m.ghostTimer);
      var ghost = m.hpGhost, p = pct;
      m.ghostTimer = setTimeout(function () { ghost.style.width = p + '%'; }, 380);
    }
    if (pct <= 0) m.el.classList.add('dying');
  }

  function updateMonsterShield(m) {
    if (!m.card) return;
    var old = m.card.querySelector('.m-shield-bubble');
    if (m.shield > 0 && !old) {
      var b = U.div('m-shield-bubble', m.card);
      b.innerHTML = SVG.icon('shield');
      b.style.display = 'flex';
      b.style.alignItems = 'center';
      b.style.justifyContent = 'center';
      b.style.fontSize = '10px';
      b.style.fontWeight = '900';
      b.textContent = Math.round(m.shield);
    } else if (m.shield > 0 && old) {
      old.textContent = Math.round(m.shield);
    } else if (old) old.remove();
  }

  function updateFrozen(m) {
    if (!m.card) return;
    var old = m.card.querySelector('.m-frozen-tag');
    if (m.frozen > 0 && !old) U.div('m-frozen-tag', m.card);
    else if (m.frozen <= 0 && old) old.remove();
  }

  function updateTelegraph(m) {
    if (!m.teleEl) return;
    var mv = DATA.MONSTER_MOVES[m.nextMove] || DATA.MONSTER_MOVES.strike;
    m.teleEl.className = 'm-telegraph ' + (mv.cls || '');
    var frozen = m.frozen > 0;
    m.teleEl.innerHTML = SVG.icon(frozen ? 'freeze' : mv.icon) +
      '<span>' + (frozen ? '冻结' : Math.max(0, m.cdLeft) + '回合') + '</span>';
    m.teleEl.classList.toggle('t-frozen', frozen);
    // 攻击预警：下一回合就动手时红色脉冲
    var urgent = !frozen && m.cdLeft === 1 && (m.nextMove === 'strike' || m.nextMove === 'heavy');
    m.teleEl.classList.toggle('urgent', urgent);
    if (m.card) m.card.classList.toggle('m-warning', urgent);
  }

  function showMonsterDetail(m) {
    AudioFX.play('select');
    var box = $('monster-detail');
    U.clearEl(box);
    var sp = U.div('md-sprite', box);
    sp.innerHTML = SVG.monster(m.family, { tint: m.tint });
    var name = U.div('md-name', box);
    name.textContent = m.name;
    var tags = U.div('md-tags', box);
    function tag(icon, color, text) {
      var t = U.div('md-tag', tags);
      t.innerHTML = SVG.icon(icon, color) + '<span>' + text + '</span>';
    }
    var weakInfo = DATA.COLOR_INFO[m.weak];
    var resistInfo = m.resist >= 0 ? DATA.COLOR_INFO[m.resist] : null;
    tag('sword', '#D95A50', '攻击 ' + Math.round(m.atk * (1 + m.buffAtk)));
    tag('clock', '#D89B22', '每 ' + m.cd + ' 回合行动');
    tag('swordHeavy', weakInfo.hex, '弱点：' + weakInfo.cn + '（' + weakInfo.elem + '）');
    if (resistInfo && m.resist !== m.weak) tag('shield', '#9A8877', '抗性：' + resistInfo.cn);
    var desc = U.div('md-desc', box);
    desc.textContent = '消除它所在列的棋子即可攻击它。用它的弱点颜色攻击，能造成 ' + Math.round(CONFIG.weakMult * 100) + '% 伤害。';
    var next = U.div('md-next', box);
    var mv = DATA.MONSTER_MOVES[m.nextMove];
    next.innerHTML = SVG.icon(mv.icon) + '<span>' + (m.frozen > 0 ? '已被冻结，暂时无法行动' : '下次行动（' + Math.max(0, m.cdLeft) + ' 回合后）：' + mv.label + ' —— ' + mv.desc) + '</span>';
    $('overlay-monster').classList.remove('hidden');
  }

  /* ============ 英雄渲染 ============ */
  function renderHeroes(battle) {
    U.clearEl(M.heroes);
    battle.heroes.forEach(function (h, i) {
      var el = U.div('hero', M.heroes);
      el.style.setProperty('--hero-glow', DATA.COLOR_INFO[h.def.color].hex);
      var ring = U.div('hero-ring', el);
      var CIRC = 2 * Math.PI * 26;
      var info = DATA.COLOR_INFO[h.def.color];
      ring.innerHTML =
        '<svg class="ring" viewBox="0 0 60 60">' +
        '<circle cx="30" cy="30" r="26" fill="none" stroke="#EFE3CB" stroke-width="5"/>' +
        '<circle class="ring-fill" cx="30" cy="30" r="26" fill="none" stroke="' + info.hex + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + CIRC.toFixed(1) + '"/>' +
        '</svg>' +
        '<div class="hero-face">' + SVG.hero(h.def.id) + '</div>';
      var nm = U.div('hero-name', el);
      nm.textContent = h.def.name;
      // 英雄生命条
      var hpBar = U.div('hero-hp', el);
      var hpFill = U.div('hero-hp-fill', hpBar);
      var hpText = U.div('hero-hp-text', hpBar);
      // 技能能量条
      var enBar = U.div('hero-energy', el);
      var enFill = U.div('hero-energy-fill', enBar);
      enFill.style.background = info.hex;
      // 释放按钮
      var cast = U.el('button', 'hero-cast', el);
      cast.type = 'button';
      cast.textContent = h.def.skill;
      h.el = el; h.ringFill = ring.querySelector('.ring-fill'); h.circ = CIRC;
      h.hpFill = hpFill; h.hpText = hpText; h.enFill = enFill; h.castEl = cast;
      el.addEventListener('click', function () {
        AudioFX.init();
        M.battle.castSkill(i);
      });
      updateHeroEnergy(h);
      updateHeroHp(i);
    });
  }

  function updateEnergy() {
    if (!M.battle) return;
    M.battle.heroes.forEach(function (h) { updateHeroEnergy(h); });
  }

  function updateHeroEnergy(h) {
    if (!h.ringFill) return;
    var pct = U.clamp(h.energy / CONFIG.energyCap, 0, 1);
    h.ringFill.style.strokeDashoffset = (h.circ * (1 - pct)).toFixed(1);
    if (h.enFill) h.enFill.style.width = (pct * 100).toFixed(1) + '%';
    h.el.classList.toggle('ready', h.energy >= CONFIG.energyCap && !h.ko);
    if (h.castEl) {
      h.castEl.classList.toggle('ready', h.energy >= CONFIG.energyCap && !h.ko);
      h.castEl.textContent = h.ko ? '晕厥' : h.def.skill;
    }
  }

  function updateHeroHp(idx) {
    var b = M.battle;
    var h = b ? b.heroes[idx] : null;
    if (!h || !h.hpFill) return;
    var pct = U.clamp(h.hp / h.hpMax, 0, 1) * 100;
    h.hpFill.style.width = pct + '%';
    if (h.hpText) h.hpText.textContent = Math.max(0, Math.round(h.hp)) + '/' + h.hpMax;
    h.el.classList.toggle('ko', !!h.ko);
  }

  function heroKO(idx) {
    var b = M.battle;
    var h = b ? b.heroes[idx] : null;
    if (!h) return;
    updateHeroHp(idx);
    updateHeroEnergy(h);
    toast(h.def.name + ' 晕厥了！无法再释放技能', 2400);
    AudioFX.play('hit');
    h.el.classList.remove('flash');
    void h.el.offsetWidth;
    h.el.classList.add('flash');
  }

  function heroRevive(idx) {
    var b = M.battle;
    var h = b ? b.heroes[idx] : null;
    if (!h) return;
    updateHeroHp(idx);
    updateHeroEnergy(h);
    toast(h.def.name + ' 苏醒了！', 1600);
    h.el.classList.remove('flash');
    void h.el.offsetWidth;
    h.el.classList.add('flash');
  }

  function flashHero(idx, ok) {
    var h = M.battle.heroes[idx];
    if (!h) return;
    h.el.classList.remove('flash');
    void h.el.offsetWidth;
    h.el.classList.add('flash');
    if (!ok) AudioFX.play('swapFail');
  }

  /* ============ HUD ============ */
  function updateMoves() {
    var b = M.battle;
    $('moves-num').textContent = Math.max(0, b.movesLeft);
    $('hud-moves').classList.toggle('low', b.movesLeft <= 5);
  }

  function updateHp() {
    var b = M.battle;
    var pct = U.clamp(b.hp / b.hpMax, 0, 1) * 100;
    $('hp-fill').style.width = pct + '%';
    $('hp-text').textContent = Math.max(0, Math.round(b.hp)) + ' / ' + b.hpMax;
  }

  function updateShield() {
    var b = M.battle;
    var chip = $('shield-chip');
    if (b.shield > 0) {
      chip.classList.remove('hidden');
      $('shield-num').textContent = Math.round(b.shield);
    } else chip.classList.add('hidden');
  }

  function playerHurt(heroIdx) {
    var b = M.battle;
    var el = (heroIdx != null && b && b.heroes[heroIdx] && b.heroes[heroIdx].el) ? b.heroes[heroIdx].el : document.querySelector('.team-strip');
    if (!el) return;
    el.classList.remove('hurt');
    void el.offsetWidth;
    el.classList.add('hurt');
  }

  function updateObjectives(battle) {
    if (!battle) return;
    var om = $('objective-mini');
    var rows = om.querySelectorAll('.obj');
    var anyDone = false;
    for (var i = 0; i < rows.length; i++) {
      var key = rows[i].dataset.key;
      var def = DATA.OBJECTIVES[key];
      if (!def) continue; // 封印徽章等非目标行
      if (def.check(battle.stats)) { rows[i].classList.add('done'); anyDone = true; }
    }
  }

  /* ============ 动画 ============ */
  function animSwap(a, b) {
    var ta = M.battle.board.at(a.r, a.c), tb = M.battle.board.at(b.r, b.c);
    // 注意：此时棋盘尚未交换，先按目标位置移动
    positionTile(ta.el, b.r, b.c);
    positionTile(tb.el, a.r, a.c);
    ta.el.classList.add('dragging'); tb.el.classList.add('dragging');
    return U.sleep(TIMING.swap).then(function () {
      ta.el.classList.remove('dragging'); tb.el.classList.remove('dragging');
    });
  }

  function animSwapBack(a, b) {
    var ta = M.battle.board.at(a.r, a.c), tb = M.battle.board.at(b.r, b.c);
    positionTile(ta.el, b.r, b.c);
    positionTile(tb.el, a.r, a.c);
    return U.sleep(TIMING.swap);
  }

  function animSwapFail(a, b) {
    AudioFX.play('swapFail');
    var ta = M.battle.board.at(a.r, a.c);
    if (ta && ta.el) {
      ta.el.classList.add('dragging');
      setTimeout(function () { ta.el.classList.remove('dragging'); }, 200);
    }
  }

  function animCreateSpecial(cr) {
    var tile = cr.tile;
    tile.el.classList.add('special', cr.special);
    var inner = tile.el.querySelector('.tile-inner');
    if (cr.special === 'prism') {
      tile.el.classList.remove('rowBomb', 'colBomb', 'crossBomb', 'bomb');
      inner.innerHTML = '<div class="glyph">' + SVG.prismGem() + '</div><div class="tile-badge"></div>';
      if (!DATA.save.tips.prism) {
        DATA.save.tips.prism = 1; DATA.persist();
        setTimeout(function () { toast('彩虹核心：点击它选一种颜色，或直接拖到相邻棋子上——消除全场该颜色！', 4200); }, 900);
      }
    } else {
      if (!inner.querySelector('.tile-badge')) inner.insertAdjacentHTML('beforeend', '<div class="tile-badge"></div>');
    }
    tile.el.classList.remove('newSpecial');
    void tile.el.offsetWidth;
    tile.el.classList.add('newSpecial');
  }

  function animTrigger(tr) {
    var center = cellCenter(tr.r, tr.c);
    var ring = U.div('fx fx-boom', M.fxRoot);
    var big = tr.special === 'crossBomb' || tr.special === 'bombCross' || tr.special === 'prism';
    var mega = tr.special === 'megaBomb';
    var size = M.cell * (mega ? 5 : big ? 4.2 : 2.6);
    ring.style.width = size + 'px';
    ring.style.height = size + 'px';
    ring.style.left = center.x + 'px';
    ring.style.top = center.y + 'px';
    if (mega) ring.style.borderColor = '#F5B93F';
    else if (tr.special === 'bombCross') ring.style.borderColor = '#F2766B';
    else if (tr.special === 'prism') ring.style.borderColor = '#A78FD9';
    setTimeout(function () { ring.remove(); }, 550);

    var n = mega ? 12 : 8;
    for (var i = 0; i < n; i++) {
      var spark = U.div('fx-spark', M.fxRoot);
      var ang = (i / n) * Math.PI * 2;
      var dist = M.cell * (1 + Math.random()) * (mega ? 1.6 : 1);
      spark.style.left = (center.x - 4) + 'px';
      spark.style.top = (center.y - 4) + 'px';
      spark.style.setProperty('--sx', (Math.cos(ang) * dist) + 'px');
      spark.style.setProperty('--sy', (Math.sin(ang) * dist) + 'px');
      spark.style.background = mega
        ? ['#F5B93F', '#F2766B', '#FFF', '#F2766B'][i % 4]
        : ['#F5B93F', '#F2766B', '#FFF'][i % 3];
      (function (s) { setTimeout(function () { s.remove(); }, 600); })(spark);
    }
    // 屏幕微震
    M.boardWrap.classList.remove('shake');
    void M.boardWrap.offsetWidth;
    M.boardWrap.classList.add('shake');
  }

  function animPop(clearSet) {
    var tiles = [];
    for (var k in clearSet) {
      var cl = clearSet[k];
      var t = M.battle.board.grid[cl.r][cl.c];
      if (t && t.el) tiles.push(t);
    }
    var perTile = tiles.length > 14 ? 2 : (tiles.length > 6 ? 3 : 5);
    tiles.forEach(function (t, i) {
      t.el.classList.add('popping');
      spawnPopBurst(t, perTile, i * 12);
    });
    return U.sleep(TIMING.pop).then(function () {
      tiles.forEach(function (t) {
        if (t.el) { t.el.remove(); t.el = null; }
      });
    });
  }

  // 消除时按棋子颜色迸发小粒子
  function spawnPopBurst(t, n, delay) {
    var color = '#FFF7E2';
    if (t.type === 'stone') color = '#CFC7B8';
    else if (typeof t.type === 'number' && t.type >= 0) color = DATA.COLOR_INFO[t.type].hex;
    var c = cellCenter(t.r, t.c);
    for (var i = 0; i < n; i++) {
      (function (i) {
        setTimeout(function () {
          var p = U.div('fx-pop', M.fxRoot);
          var ang = (i / n) * Math.PI * 2 + Math.random() * 0.9;
          var dist = M.cell * (0.5 + Math.random() * 0.8);
          p.style.left = (c.x - 4) + 'px';
          p.style.top = (c.y - 4) + 'px';
          p.style.background = color;
          p.style.width = p.style.height = (6 + Math.random() * 5) + 'px';
          p.style.setProperty('--px', (Math.cos(ang) * dist) + 'px');
          p.style.setProperty('--py', (Math.sin(ang) * dist - M.cell * 0.25) + 'px');
          setTimeout(function () { p.remove(); }, 520);
        }, delay);
      })(i);
    }
  }

  function animFall(falls) {
    falls.forEach(function (f) {
      if (f.tile.el) {
        f.tile.el.classList.add('falling');
        positionTile(f.tile.el, f.toR, f.tile.c);
        (function (el) {
          setTimeout(function () { el.classList.remove('falling'); }, 300);
        })(f.tile.el);
      }
    });
    return U.sleep(TIMING.fall);
  }

  function animSpawn(spawns) {
    spawns.forEach(function (s) {
      makeTileEl(s.tile);
      s.tile.el.classList.add('spawn');
      (function (el) {
        setTimeout(function () { el.classList.remove('spawn'); }, 380);
      })(s.tile.el);
    });
    return U.sleep(TIMING.spawn - 120);
  }

  function reshuffleBoard() {
    toast('重新洗牌！', 1400);
    var b = M.battle.board;
    for (var r = 0; r < b.rows; r++) {
      for (var c = 0; c < b.cols; c++) {
        var t = b.grid[r][c];
        if (t && t.el) {
          t.el.classList.add('falling-2');
          positionTile(t.el, r, c);
        }
      }
    }
    return U.sleep(360);
  }

  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function heroCenter(h) {
    if (!h || !h.el) return { x: 0, y: 0 };
    var r = h.el.getBoundingClientRect();
    var sr = M.screenBattle.getBoundingClientRect();
    return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
  }

  function monsterCenter(m) {
    if (!m.card) return { x: 0, y: 0 };
    var r = m.card.getBoundingClientRect();
    var sr = M.screenBattle.getBoundingClientRect();
    return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
  }

  function animProjectiles(hits, applyFn) {
    var proms = [];
    var useTrail = hits.length <= 6;
    hits.forEach(function (hit, i) {
      var p = new Promise(function (res) {
        setTimeout(function () {
          var src = cellCenter(hit.r, hit.c);
          var dst = monsterCenter(hit.target);
          var pr = U.div('fx fx-projectile' + (hit.weak ? ' big' : '') + (hit.sealed ? ' sealed' : ''), M.fxRoot);
          pr.innerHTML = SVG.glyph(hit.color);
          pr.style.left = src.x + 'px';
          pr.style.top = src.y + 'px';
          var dx = dst.x - src.x, dy = dst.y - src.y;
          var finished = false;
          var trail = null;
          function finish() {
            if (finished) return;
            finished = true;
            if (trail) clearInterval(trail);
            pr.remove();
            try { applyFn(hit); } catch (e) { if (window.console && console.error) console.error(e); }
            res();
          }
          // 弹道拖尾：飞行途中留下渐隐光点
          if (useTrail) {
            var sr = M.screenBattle.getBoundingClientRect();
            trail = setInterval(function () {
              var r = pr.getBoundingClientRect();
              if (!r || !r.width) return;
              var dot = U.div('fx-trail', M.fxRoot);
              dot.style.left = (r.left - sr.left + r.width / 2 - 6) + 'px';
              dot.style.top = (r.top - sr.top + r.height / 2 - 6) + 'px';
              dot.style.background = DATA.COLOR_INFO[hit.color].hex;
              setTimeout(function () { dot.remove(); }, 320);
            }, 55);
          }
          try {
            var anim = pr.animate([
              { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
              { transform: 'translate(calc(-50% + ' + (dx * 0.5) + 'px), calc(-50% + ' + (dy * 0.5 - 30) + 'px)) scale(1.15)', opacity: 1, offset: 0.5 },
              { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.7)', opacity: .9 }
            ], { duration: 380, easing: 'cubic-bezier(.3,.6,.6,1)' });
            anim.onfinish = finish;
          } catch (e) { /* 极老内核无 WAAPI：走兜底计时 */ }
          // 兜底：动画卡住（如后台标签页）时也要推进结算，避免流程挂死
          setTimeout(finish, 620);
        }, i * 70);
      });
      proms.push(p);
    });
    return Promise.all(proms);
  }

  function showDamage(m, amount, hit) {
    var pos = monsterCenter(m);
    if (hit.sealed) {
      // 封印命中：灰色「封印」胶囊，无闪光、无受击动画
      var pillS = U.div('fx-dmg sealed', M.fxRoot);
      pillS.textContent = '封印';
      pillS.style.left = pos.x + 'px';
      pillS.style.top = (pos.y - 10) + 'px';
      (function (p) { setTimeout(function () { p.remove(); }, 1100); })(pillS);
      return;
    }
    // 命中冲击闪光（按攻击颜色）
    var hex = DATA.COLOR_INFO[hit.color].hex;
    var burst = U.div('fx-impact', M.fxRoot);
    burst.style.width = burst.style.height = (hit.weak ? 88 : 64) + 'px';
    burst.style.left = pos.x + 'px';
    burst.style.top = pos.y + 'px';
    burst.style.background = 'radial-gradient(circle, rgba(255,255,255,.95) 0%, ' + hexA(hex, .6) + ' 45%, rgba(255,255,255,0) 72%)';
    setTimeout(function () { burst.remove(); }, 420);
    var pill = U.div('fx-dmg ' + DATA.COLOR_INFO[hit.color].key + (hit.weak ? ' weak' : ''), M.fxRoot);
    pill.textContent = (hit.weak ? '弱点! -' : '-') + amount;
    pill.style.left = pos.x + 'px';
    pill.style.top = (pos.y - 10) + 'px';
    (function (p) { setTimeout(function () { p.remove(); }, 1100); })(pill);

    if (hit.weak) {
      m.el.classList.remove('weakhit');
      void m.el.offsetWidth;
      m.el.classList.add('weakhit');
    } else {
      m.el.classList.remove('hit');
      void m.el.offsetWidth;
      m.el.classList.add('hit');
    }
  }

  function animDeaths(dead) {
    AudioFX.play('monsterDie');
    dead.forEach(function (m, i) {
      (function (mm, ii) {
        setTimeout(function () {
          mm.el.classList.add('dying');
          var pos = monsterCenter(mm);
          var pill = U.div('fx-dmg info', M.fxRoot);
          pill.textContent = '击败！';
          pill.style.left = pos.x + 'px';
          pill.style.top = pos.y + 'px';
          setTimeout(function () { pill.remove(); }, 1000);
        }, ii * 120);
      })(m, i);
    });
    return U.sleep(TIMING.death).then(function () {
      dead.forEach(function (m) {
        m.el.classList.remove('dying');
        m.el.classList.add('dead-slot');
      });
    });
  }

  function monsterAct(m, kind, payload, heroIdx) {
    var pos = monsterCenter(m);
    if (kind === 'strike' || kind === 'heavy') {
      // 扑向英雄
      if (m.card) {
        m.card.animate([
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(16px) scale(1.08)', offset: 0.4 },
          { transform: 'translateY(0) scale(1)' }
        ], { duration: 420, easing: 'ease-out' });
      }
      var pr = U.div('fx fx-projectile', M.fxRoot);
      pr.innerHTML = SVG.icon(kind === 'heavy' ? 'swordHeavy' : 'sword', '#D95A50');
      var heroEl = null;
      var b = M.battle;
      if (heroIdx != null && b && b.heroes[heroIdx] && b.heroes[heroIdx].el) heroEl = b.heroes[heroIdx].el;
      if (!heroEl && b) {
        var th = b.pickHeroTarget();
        if (th && th.el) heroEl = th.el;
      }
      if (!heroEl) heroEl = document.querySelector('.team-strip');
      var hr = heroEl.getBoundingClientRect();
      var sr = M.screenBattle.getBoundingClientRect();
      var dst = { x: hr.left - sr.left + hr.width / 2, y: hr.top - sr.top + hr.height / 2 };
      pr.style.left = pos.x + 'px';
      pr.style.top = pos.y + 'px';
      var dx = dst.x - pos.x, dy = dst.y - pos.y;
      var anim = pr.animate([
        { transform: 'translate(-50%,-50%) scale(1)' },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.8)' }
      ], { duration: 400, easing: 'ease-in' });
      anim.onfinish = function () { pr.remove(); };
      return U.sleep(430);
    }
    if (kind === 'shield') {
      m.shield = m.shield; updateMonsterShield(m);
      var pill = U.div('fx-dmg shield', M.fxRoot);
      pill.textContent = '护盾 +' + payload;
      pill.style.left = pos.x + 'px';
      pill.style.top = pos.y + 'px';
      setTimeout(function () { pill.remove(); }, 1000);
      return U.sleep(420);
    }
    if (kind === 'curse') {
      payload.forEach(function (cl, i) {
        var c = cellCenter(cl.r, cl.c);
        var zap = U.div('fx-dmg info', M.fxRoot);
        zap.textContent = '石化';
        zap.style.left = c.x + 'px';
        zap.style.top = c.y + 'px';
        zap.style.background = '#A78FD9';
        setTimeout(function () { zap.remove(); }, 900);
      });
      return U.sleep(480);
    }
    if (kind === 'summon') {
      renderMonsters(M.battle);
      var np = monsterCenter(payload);
      var pill2 = U.div('fx-dmg info', M.fxRoot);
      pill2.textContent = '召唤！';
      pill2.style.left = np.x + 'px';
      pill2.style.top = np.y + 'px';
      pill2.style.background = '#6DC087';
      setTimeout(function () { pill2.remove(); }, 1000);
      return U.sleep(480);
    }
    if (kind === 'buff') {
      var up = U.div('fx-dmg info', M.fxRoot);
      up.textContent = '攻击强化！';
      up.style.left = pos.x + 'px';
      up.style.top = pos.y + 'px';
      up.style.background = '#F5B93F';
      setTimeout(function () { up.remove(); }, 1000);
      return U.sleep(420);
    }
    if (kind === 'heal') {
      var tp = monsterCenter(payload.target);
      var hp = U.div('fx-dmg heal', M.fxRoot);
      hp.textContent = '+' + payload.amount;
      hp.style.left = tp.x + 'px';
      hp.style.top = tp.y + 'px';
      setTimeout(function () { hp.remove(); }, 1000);
      updateMonsterHp(payload.target);
      return U.sleep(420);
    }
    return U.sleep(200);
  }

  function convertStones(cells) {
    cells.forEach(function (cl) {
      var t = M.battle.board.at(cl.r, cl.c);
      if (t && t.el) {
        t.el.classList.add('stone');
        t.el.querySelector('.tile-inner').innerHTML = '<div class="glyph">' + SVG.stone() + '</div>';
      }
    });
  }

  function floatPlayerText(text, kind, heroIdx) {
    var b = M.battle;
    var el = (heroIdx != null && b && b.heroes[heroIdx] && b.heroes[heroIdx].el) ? b.heroes[heroIdx].el : document.querySelector('.team-strip');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var sr = M.screenBattle.getBoundingClientRect();
    var pill = U.div('fx-dmg ' + (kind === 'heal' ? 'heal' : kind === 'shield' ? 'shield' : 'r'), M.fxRoot);
    pill.textContent = text;
    pill.style.left = (r.left - sr.left + r.width / 2) + 'px';
    pill.style.top = (r.top - sr.top - 4) + 'px';
    (function (p) { setTimeout(function () { p.remove(); }, 1100); })(pill);
  }

  function flyEnergy(counts) {
    var br = M.board.getBoundingClientRect();
    var sr = M.screenBattle.getBoundingClientRect();
    for (var c = 0; c < 5; c++) {
      if (counts[c] <= 0) continue;
      var h = M.battle.heroes[c];
      if (!h || !h.el) continue;
      var hr = h.el.getBoundingClientRect();
      for (var i = 0; i < Math.min(3, counts[c]); i++) {
        var orb = U.div('fx-energy', M.fxRoot);
        orb.style.color = DATA.COLOR_INFO[c].hex;
        orb.style.background = DATA.COLOR_INFO[c].hex;
        var sx = br.left - sr.left + M.cell * (1 + Math.random() * 4);
        var sy = br.top - sr.top + M.cell * (1 + Math.random() * 5);
        orb.style.left = sx + 'px';
        orb.style.top = sy + 'px';
        orb.style.setProperty('--ex', (hr.left - sr.left + hr.width / 2 - sx) + 'px');
        orb.style.setProperty('--ey', (hr.top - sr.top + hr.height / 2 - sy) + 'px');
        orb.style.animationDelay = (i * 60) + 'ms';
        (function (o) { setTimeout(function () { o.remove(); }, 900); })(orb);
      }
    }
  }

  function showCombo(waveIdx) {
    var el = $('combo-pop');
    el.textContent = '连锁 ×' + waveIdx + '！';
    el.className = 'combo-pop' + (waveIdx >= 4 ? '' : ' small');
    // 重启动画
    el.classList.remove('hidden');
    void el.offsetWidth;
    clearTimeout(M.comboTimer);
    M.comboTimer = setTimeout(function () { el.classList.add('hidden'); }, 900);
  }

  /* ============ 波次切换 / 战斗提示 ============ */
  function updateWaveChip(battle) {
    var chip = $('wave-chip');
    if (!chip) return;
    var total = battle.waves ? battle.waves.length : 1;
    if (total <= 1) { chip.classList.add('hidden'); return; }
    chip.classList.remove('hidden');
    chip.textContent = (battle.waveIndex + 1) + '/' + total + ' 波';
  }

  function renderWave(battle, bonusMoves) {
    renderMonsters(battle, true);
    updateWaveChip(battle);
    updateBattleTip();
    AudioFX.play('bless');
    var banner = U.div('wave-banner', M.fxRoot);
    banner.textContent = '第 ' + (battle.waveIndex + 1) + ' / ' + battle.waves.length + ' 波来袭！ +' + bonusMoves + ' 步';
    setTimeout(function () { banner.remove(); }, 1750);
    return U.sleep(720);
  }

  var TIP_POOL = [
    '三连消除，四连炸弹，五连彩虹核心！',
    '棋子在哪一列，就攻击哪一列的怪物！',
    '连锁消除越多，伤害倍率越高！',
    '怪物会集火能量最高的英雄！',
    '英雄倒下时，用星辉恩泽救回！',
    '红色预警亮起：怪物即将攻击！'
  ];
  var tipIdx = 0;
  function updateBattleTip() {
    var b = M.battle;
    var el = $('battle-tip');
    if (!el || !b) return;
    var warn = null;
    for (var i = 0; i < b.monsters.length; i++) {
      var m = b.monsters[i];
      if (m.alive && m.frozen <= 0 && m.cdLeft === 1) { warn = m; break; }
    }
    if (warn) {
      el.textContent = '⚠ ' + warn.name + ' 即将攻击！快集火或冻结它';
      el.className = 'battle-tip warn';
      return;
    }
    for (var j = 0; j < b.heroes.length; j++) {
      var h = b.heroes[j];
      if (!h.ko && h.energy >= CONFIG.energyCap) {
        el.textContent = '✦ ' + h.def.name + '「' + h.def.skill + '」就绪，点头像施放';
        el.className = 'battle-tip go';
        return;
      }
    }
    el.textContent = TIP_POOL[tipIdx % TIP_POOL.length];
    tipIdx++;
    el.className = 'battle-tip';
  }

  function heroCastFX(h) {
    var info = DATA.COLOR_INFO[h.def.color];
    var layer = U.div('fx-skill', M.fxRoot);
    // 全屏色彩涟漪（英雄主题色，自底部扩散）
    var flash = U.div('fx-skill-flash', layer);
    flash.style.background = 'radial-gradient(circle at 50% 88%, ' + hexA(info.hex, .45) + ' 0%, ' + hexA(info.hex, .15) + ' 45%, rgba(255,255,255,0) 72%)';
    // 英雄位置的能量爆发环
    var hc = heroCenter(h);
    var ring = U.div('fx-skill-ring', layer);
    ring.style.left = hc.x + 'px';
    ring.style.top = hc.y + 'px';
    ring.style.borderColor = info.hex;
    var banner = U.div('fx-skill-banner', layer);
    banner.innerHTML = '<span class="sb-glyph">' + SVG.hero(h.def.id) + '</span>' +
      '<span>' + h.def.name + ' · ' + h.def.skill + '</span>';
    banner.style.color = info.deep;
    // 光环
    var glow = U.div('fx-boom', layer);
    glow.style.width = '300px'; glow.style.height = '300px';
    glow.style.left = '50%'; glow.style.top = '35%';
    h.el.classList.add('casting');
    setTimeout(function () { h.el.classList.remove('casting'); }, 700);
    setTimeout(function () { layer.remove(); }, 1200);
    return U.sleep(TIMING.skill);
  }

  function skillHit(h, m, dmg, color) {
    AudioFX.play('slash');
    var pos = monsterCenter(m);
    var info = DATA.COLOR_INFO[color];
    var layer = U.div('fx-skill', M.fxRoot);
    var slash = U.div('fx-slash', layer);
    slash.innerHTML = SVG.glyph(color);
    slash.style.left = pos.x + 'px';
    slash.style.top = pos.y + 'px';
    // 冲击波环 + 中心闪光
    var wave = U.div('fx-shockwave', layer);
    wave.style.left = pos.x + 'px';
    wave.style.top = pos.y + 'px';
    wave.style.borderColor = info.hex;
    var core = U.div('fx-impact', layer);
    core.style.width = core.style.height = '110px';
    core.style.left = pos.x + 'px';
    core.style.top = pos.y + 'px';
    core.style.background = 'radial-gradient(circle, rgba(255,255,255,.95) 0%, ' + hexA(info.hex, .55) + ' 45%, rgba(255,255,255,0) 70%)';
    setTimeout(function () { layer.remove(); }, 560);
    m.el.classList.remove('hit');
    void m.el.offsetWidth;
    m.el.classList.add('hit');
    return U.sleep(300);
  }

  /* ============ 提示 ============ */
  function doHint() {
    if (!M.battle || M.battle.busy || M.battle.over) return;
    var hint = M.battle.board.findHint();
    if (!hint) return;
    AudioFX.play('select');
    showHintPulse(hint.a, hint.b);
    resetIdleTimer();
  }

  function showHintPulse(a, b) {
    var ta = M.battle.board.at(a.r, a.c), tb = M.battle.board.at(b.r, b.c);
    [ta, tb].forEach(function (t) {
      if (t && t.el) {
        var el = t.el; // 捕获引用：棋子可能在延时期间被消除（t.el 置 null）
        el.classList.add('selected');
        setTimeout(function () { el.classList.remove('selected'); }, 2200);
      }
    });
  }

  function resetIdleTimer() {
    clearTimeout(M.idleTimer);
    if (!M.battle || M.battle.level.tutorial) return;
    M.idleTimer = setTimeout(function () {
      if (M.battle && !M.battle.busy && !M.battle.over) {
        var hint = M.battle.board.findHint();
        if (hint) showHintPulse(hint.a, hint.b);
      }
    }, 12000);
  }

  /* ============ 事件分发 ============ */
  function emit(name, data) {
    Guide.onEvent(name, data);
    // 一次性道具提示
    if (name === 'specialBorn' && data && data.length) {
      var save = DATA.save;
      var hasPrism = data.some(function (cr) { return cr.special === 'prism'; });
      var hasBomb = data.some(function (cr) { return cr.special !== 'prism'; });
      if (hasPrism && !save.tips.prism) {
        save.tips.prism = 1; DATA.persist();
        toast('彩虹核心诞生！点击它选择颜色消除全场，或与相邻棋子交换！', 3600);
      } else if (hasBomb && !save.tips.bomb) {
        save.tips.bomb = 1; DATA.persist();
        toast('炸弹诞生！它被消除或卷入爆炸时，引爆 3×3 范围！', 3200);
      }
    }
    if (name === 'turnEnd' || name === 'win' || name === 'lose') {
      updateObjectives(M.battle);
      if (name === 'turnEnd') { resetIdleTimer(); updateBattleTip(); }
    }
    if (name === 'energyFull' || name === 'waveAdvance') updateBattleTip();
  }

  /* ============ 结算 / 祝福 / 覆盖层 ============ */
  function hideOverlay(id) { $(id).classList.add('hidden'); }

  function showResult(win, stars, score, objResults, stats, reason, isBest) {
    var ov = $('overlay-result');
    var title = $('result-title');
    title.textContent = win ? (M.level.n === 60 ? '远征完成！' : '探索成功') : (reason === 'moves' ? '步数耗尽' : '全队晕厥');
    title.className = 'result-title ' + (win ? 'win' : 'lose');

    var starsBox = $('result-stars');
    U.clearEl(starsBox);
    for (var i = 0; i < 3; i++) {
      var s = U.div('star', starsBox);
      s.innerHTML = SVG.icon(i < stars ? 'starFill' : 'starEmpty');
      if (i < stars) {
        (function (el, ii) {
          setTimeout(function () {
            el.classList.add('lit');
            AudioFX.play('star');
          }, 350 + ii * 260);
        })(s, i);
      }
    }

    $('result-score').textContent = win
      ? '得分 ' + U.fmt(score) + (isBest ? ' · 新纪录！' : (DATA.save.best[M.level.n] ? ' · 最佳 ' + U.fmt(DATA.save.best[M.level.n]) : ''))
      : '再试一次，胜利就在前方';

    var objs = $('result-objs');
    U.clearEl(objs);
    if (win) {
      var all = [{ key: 'win', def: { desc: '击败所有怪物', icon: 'check' }, done: true }].concat(objResults);
      all.forEach(function (o) {
        var row = U.div('result-obj' + (o.done ? ' done' : ''), objs);
        row.innerHTML = SVG.icon(o.def.icon) + '<span>' + o.def.desc + '</span>';
      });
    }

    var statsBox = $('result-stats');
    U.clearEl(statsBox);
    if (win) {
      var chips = [
        ['最大连锁', '×' + Math.max(1, stats.maxWave)],
        ['总伤害', U.fmt(stats.damageDealt)],
        ['技能释放', stats.skillCasts + ' 次'],
        ['引爆炸弹', stats.bombsUsed + ' 枚']
      ];
      if (stats.wavesCleared > 0) chips.push(['击败波次', stats.wavesCleared + ' 波']);
      chips.forEach(function (c) {
        var chip = U.div('stat-chip', statsBox);
        chip.innerHTML = c[0] + ' <b>' + c[1] + '</b>';
      });
    }

    var btns = $('result-btns');
    U.clearEl(btns);
    if (win) {
      if (M.level.n < 60) {
        var next = U.el('button', 'btn btn-primary', btns);
        next.textContent = '获取祝福，继续前进';
        next.addEventListener('click', function () {
          AudioFX.play('select');
          hideOverlay('overlay-result');
          showBlessChoice();
        });
      }
      var back = U.el('button', 'btn btn-soft', btns);
      back.textContent = '返回地图';
      back.addEventListener('click', function () { hideOverlay('overlay-result'); quitBattle(); });
    } else {
      var retry = U.el('button', 'btn btn-primary', btns);
      retry.textContent = '重新挑战';
      retry.addEventListener('click', function () {
        AudioFX.play('select');
        hideOverlay('overlay-result');
        startBattle(M.level.n);
      });
      var back2 = U.el('button', 'btn btn-soft', btns);
      back2.textContent = '返回地图';
      back2.addEventListener('click', function () { hideOverlay('overlay-result'); quitBattle(); });
    }
    ov.classList.remove('hidden');
  }

  function showBlessChoice() {
    var save = DATA.save;
    if (!save.run) { showMap(); return; }
    var cards = $('bless-cards');
    U.clearEl(cards);
    var picks = [];
    var pool = DATA.BLESSINGS.slice();
    for (var i = 0; i < 3 && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    picks.forEach(function (b) {
      var card = U.el('button', 'bless-card', cards);
      card.innerHTML =
        '<span class="bless-ic">' + SVG.icon(b.icon, '#D89B22') + '</span>' +
        '<span><div class="bless-name">' + b.name + '</div><div class="bless-desc">' + b.desc + '</div></span>';
      card.addEventListener('click', function () {
        if (card.classList.contains('picked')) return;
        card.classList.add('picked');
        AudioFX.play('bless');
        save.run.blessings.push(b.id);
        DATA.persist();
        setTimeout(function () {
          hideOverlay('overlay-bless');
          startBattle(save.run.level);
        }, 650);
      });
    });
    // 存量祝福概览
    var count = save.run.blessings.length;
    $('overlay-bless').querySelector('.panel-sub').textContent =
      '选择一份力量，伴随你的远征' + (count > 0 ? '（已持有 ' + count + ' 份祝福）' : '');
    $('overlay-bless').classList.remove('hidden');
  }

  function showBuffsOverlay() {
    var save = DATA.save;
    var box = $('buffs-list');
    U.clearEl(box);
    var ids = save.run ? save.run.blessings : [];
    if (!ids.length) {
      U.div('buffs-empty', box).textContent = '尚未获得祝福 —— 连续通关来积累远征祝福吧！';
    } else {
      var grouped = {};
      ids.forEach(function (id) { grouped[id] = (grouped[id] || 0) + 1; });
      for (var id in grouped) {
        var b = DATA.BLESS_MAP[id];
        if (!b) continue;
        var row = U.div('buff-row', box);
        row.innerHTML = '<span class="b-ic">' + SVG.icon(b.icon, '#D89B22') + '</span>' +
          '<span><div class="b-name">' + b.name + '</div><div class="b-desc">' + b.desc + '</div></span>' +
          '<span class="b-lv">×' + grouped[id] + '</span>';
      }
    }
    $('overlay-buffs').classList.remove('hidden');
  }

  /* ============ 存档迁移（导出 / 导入） ============ */
  function openSaveIO() {
    $('save-export').value = DATA.exportCode();
    $('save-import').value = '';
    var dc = $('save-device-code');
    if (dc) dc.textContent = '本机设备码 ' + DATA.getDeviceCode() + ' · 存档按设备自动保存';
    $('overlay-save').classList.remove('hidden');
  }

  function copySaveCode() {
    var ta = $('save-export');
    ta.focus();
    ta.select();
    function done() { toast('已复制！到另一台设备粘贴导入即可', 2400); AudioFX.play('select'); }
    function fail() { toast('复制失败，请长按存档码手动复制', 2400); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(done, function () {
        try { document.execCommand('copy') ? done() : fail(); } catch (e) { fail(); }
      });
    } else {
      try { document.execCommand('copy') ? done() : fail(); } catch (e) { fail(); }
    }
  }

  function importSave() {
    var code = $('save-import').value;
    if (!code.trim()) { toast('请先粘贴存档码', 2000); return; }
    if (DATA.importCode(code)) {
      AudioFX.enabled = DATA.save.sound !== false;
      refreshSoundButtons();
      hideOverlay('overlay-save');
      refreshTitleProgress();
      toast('导入成功！进度已恢复到第 ' + DATA.save.unlocked + ' 关', 2600);
      AudioFX.play('bless');
    } else {
      toast('存档码无效，请检查是否完整', 2400);
    }
  }

  /* ============ Toast ============ */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, ms || 1600);
  }

  /* ============ 教程引导 ============ */
  var Guide = {
    active: false, step: 0, battle: null, handEl: null, bubbleEl: null, timer: null,

    begin: function (battle) {
      this.active = true; this.step = 0; this.battle = battle;
      this.handEl = $('guide-hand');
      this.bubbleEl = $('guide-bubble');
      this.handEl.innerHTML = SVG.hand();
      $('guide-layer').classList.remove('hidden');
      this.show(0);
    },

    stop: function () {
      this.active = false;
      $('guide-layer').classList.add('hidden');
      clearTimeout(this.timer);
    },

    bubble: function (text) {
      this.bubbleEl.textContent = text;
      this.bubbleEl.style.animation = 'none';
      void this.bubbleEl.offsetWidth;
      this.bubbleEl.style.animation = '';
    },

    pointAt: function (x, y, dx, dy) {
      var h = this.handEl;
      h.style.left = (x + (dx || 0)) + 'px';
      h.style.top = (y + (dy || 0)) + 'px';
    },

    pointCell: function (r, c, dx, dy) {
      var center = cellCenter(r, c);
      this.pointAt(center.x - 20, center.y - 12, dx, dy);
    },

    pointHero: function (idx) {
      var h = M.battle.heroes[idx];
      if (!h || !h.el) return;
      var r = h.el.getBoundingClientRect();
      var sr = M.screenBattle.getBoundingClientRect();
      this.pointAt(r.left - sr.left + r.width / 2 - 20, r.top - sr.top + r.height / 2 - 16);
    },

    show: function (step) {
      var b = this.battle;
      if (!b || !this.active) return;
      var self = this;
      this.step = step;

      if (step === 0) {
        this.bubble('点住花瓣，向下滑动，交换棋子！');
        // 固定引导位
        var ok = b.board.at(5, 2) && b.board.at(6, 2) &&
          b.board.at(5, 2).type === 1 && b.board.at(6, 2).type === 0;
        if (ok) this.pointCell(5, 2, 0, 10);
        else {
          var hint = b.board.findHint();
          if (hint) { this.pointCell(hint.a.r, hint.a.c, 0, 10); this.bubble('交换相邻棋子，连成三个吧！'); }
        }
      } else if (step === 1) {
        var hong = b.heroes[0];
        if (hong.energy >= CONFIG.energyCap) {
          this.bubble('能量满了！点击绯樱的头像，释放技能！');
          this.pointHero(0);
        } else {
          var hint2 = b.board.findHint();
          if (hint2) {
            this.bubble('消除花瓣（红色），为绯樱积攒能量！');
            this.pointCell(hint2.a.r, hint2.a.c, 0, 10);
          } else this.bubble('继续消除，积攒能量！');
        }
      } else if (step === 2) {
        // 脚本路径：四连引导（(4,4)蓝 ↔ (5,4)黄 往下换）
        var t44 = b.board.at(4, 4), t54 = b.board.at(5, 4);
        if (t44 && t54 && t44.type === 1 && t54.type === 3) {
          this.bubble('把星星往下换——四连会诞生炸弹！');
          this.pointCell(4, 4, 0, 14);
          return;
        }
        var sp = b.board.findSpecialSwap();
        if (sp) {
          this.bubble('连成四连试试！四连会诞生炸弹！');
          this.pointCell(sp.a.r, sp.a.c, 0, 14);
        } else {
          var hint3 = b.board.findHint();
          if (hint3) {
            this.bubble('继续消除！四连会诞生炸弹哦！');
            this.pointCell(hint3.a.r, hint3.a.c, 0, 14);
          }
        }
      } else if (step === 3) {
        this.bubble('在步数用完前，击败所有怪物吧！');
        this.handEl.style.display = 'none';
        this.timer = setTimeout(function () { self.stop(); }, 4200);
      }
    },

    onEvent: function (name, data) {
      if (!this.active) return;
      var b = this.battle;
      if (!b) return;

      if (this.step === 0 && name === 'moveUsed') {
        this.show(1);
        return;
      }
      if (this.step === 1) {
        if (name === 'energyFull' && data && data.def && data.def.id === 'hong') this.show(1);
        else if (name === 'turnEnd') this.show(1);
        else if (name === 'skillCast') this.show(2);
        return;
      }
      if (this.step === 2) {
        if (name === 'specialBorn' || name === 'bombTriggered') {
          toast('炸弹诞生了！', 1500);
          this.show(3);
        } else if (name === 'turnEnd') {
          this.show(2);
        }
        return;
      }
    }
  };

  /* ============ 导出 ============ */
  var UI = {
    init: init,
    startBattle: startBattle,
    showMap: showMap,
    showTitle: showTitle,
    toast: toast,
    get battle() { return M.battle; },

    // battle 回调
    emit: emit,
    lockBoard: lockBoard,
    updateMoves: updateMoves,
    updateHp: updateHp,
    updateShield: updateShield,
    updateEnergy: updateEnergy,
    updateMonsterHp: updateMonsterHp,
    updateMonsterShield: updateMonsterShield,
    updateFrozen: updateFrozen,
    updateTelegraph: updateTelegraph,
    updateObjectives: updateObjectives,
    updateHeroHp: updateHeroHp,
    heroKO: heroKO,
    heroRevive: heroRevive,
    renderWave: renderWave,
    playerHurt: playerHurt,
    flashHero: flashHero,
    animSwap: animSwap,
    animSwapBack: animSwapBack,
    animSwapFail: animSwapFail,
    animCreateSpecial: animCreateSpecial,
    animTrigger: animTrigger,
    animPop: animPop,
    animFall: animFall,
    animSpawn: animSpawn,
    animProjectiles: animProjectiles,
    animDeaths: animDeaths,
    monsterAct: monsterAct,
    convertStones: convertStones,
    floatPlayerText: floatPlayerText,
    flyEnergy: flyEnergy,
    showCombo: showCombo,
    heroCastFX: heroCastFX,
    skillHit: skillHit,
    showDamage: showDamage,
    reshuffleBoard: reshuffleBoard,
    showResult: showResult
  };

  return UI;
})();
