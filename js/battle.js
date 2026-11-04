/* ==========================================================
   战斗控制器：状态 + 数值 + 流程编排
   ========================================================== */

var TIMING = {
  swap: 190, pop: 230, fall: 280, spawn: 300,
  trigger: 320, projectile: 380, stagger: 45,
  death: 420, monsterAct: 550, skill: 800
};

function Battle(level, runState) {
  this.level = level;
  this.n = level.n;
  this.rng = U.rng(level.n * 7919 + 3);
  this.runState = runState; // {hp, shield, blessings: [id...]} 或 null
  this.busy = false;
  this.over = false;
  this.winFlag = false;

  var mods = runState ? DATA.modsFromBlessings(runState.blessings) : DATA.modsFromBlessings([]);
  this.mods = mods;

  this.hpMax = CONFIG.playerHp + mods.hpMax;
  this.hp = runState ? Math.min(runState.hp, this.hpMax) : this.hpMax;
  this.shield = (runState ? runState.shield : 0) + (mods.startShield || 0);
  this.movesLeft = level.moves + mods.moves;
  this.movesUsed = 0;

  // 英雄（每人独立生命：总生命平分，余数给前排）
  this.heroes = DATA.HEROES.map(function (h, i) {
    return { def: h, idx: i, energy: level.startEnergy || 0 };
  });
  var perMax = Math.ceil(this.hpMax / 5);
  var hpBase = Math.floor(this.hp / 5);
  var hpRem = this.hp - hpBase * 5;
  this.heroes.forEach(function (h, i) {
    h.hpMax = perMax;
    h.hp = Math.min(perMax, hpBase + (i < hpRem ? 1 : 0));
    h.ko = h.hp <= 0;
  });
  if (mods.startFull > 0) {
    var fullCount = Math.floor(mods.startFull);
    var bag = U.shuffle(this.rng, [0, 1, 2, 3, 4]).slice(0, fullCount);
    var self = this;
    bag.forEach(function (i) { self.heroes[i].energy = CONFIG.energyCap; });
  }
  this.modsEnergyGain = 1 + mods.energyGain;

  // 棋盘
  this.board = new Board({ rng: this.rng, tutorial: !!level.tutorial });

  // 怪物波次
  this.waves = level.waves || [level.monsters];
  this.waveIndex = 0;
  this.spawnWave(0);

  // 战斗统计（用于隐藏目标）
  this.stats = {
    maxWave: 0, maxWaveDamage: 0, bombsUsed: 0, prismUsed: false,
    skillCasts: 0, weakHits: 0, totalHurt: 0, movesUsed: 0, movesLeft: 0,
    damageDealt: 0, kills: 0, wavesCleared: 0
  };
  this.firstWaveUsed = false;
  this.ui = null;
}

Battle.prototype = {

  start: function (ui) {
    this.ui = ui;
    // 决定初始预警
    var self = this;
    this.monsters.forEach(function (m) { m.nextMove = self.pickMove(m); });
  },

  /* ============ 怪物波次 ============ */
  spawnWave: function (wi) {
    var mods = this.mods;
    this.waveIndex = wi;
    this.monsters = this.waves[wi].map(function (m) {
      return {
        family: m.family, name: m.name, size: m.size, cols: m.cols.slice(),
        hp: m.hp, hpMax: m.hp, atk: m.atk, cd: m.cd,
        cdLeft: m.cd + (wi === 0 ? (mods.startFreeze || 0) : 0),
        frozen: wi === 0 ? (mods.startFreeze || 0) : 0,
        weak: m.weak, resist: m.resist, moves: m.moves, tint: m.tint,
        isBoss: m.isBoss, isElite: m.isElite, isMinion: m.isMinion,
        shield: 0, buffAtk: 0, alive: true, nextMove: 'strike', telegraphed: false
      };
    });
  },

  // 击败整波：奖励步数并召唤下一波
  advanceWave: async function () {
    this.stats.wavesCleared++;
    this.movesLeft += 3;
    this.spawnWave(this.waveIndex + 1);
    var self = this;
    this.monsters.forEach(function (m) { m.nextMove = self.pickMove(m); });
    await this.ui.renderWave(this, 3);
    this.ui.updateMoves();
    this.ui.emit('waveAdvance', { index: this.waveIndex });
  },

  /* ============ 输入 ============ */
  trySwap: async function (a, b) {
    if (this.busy || this.over) return;
    if (!this.board.canSwap(a, b)) return;
    var ta = this.board.at(a.r, a.c), tb = this.board.at(b.r, b.c);
    var comboSwap = !!(ta.special && tb.special); // 双特殊组合交换
    var prismSwap = ta.special === 'prism' || tb.special === 'prism';
    if (!comboSwap && !prismSwap && !this.board.isValidSwap(a, b)) {
      this.ui.animSwapFail(a, b);
      return;
    }
    this.busy = true;
    this.ui.lockBoard(true);
    try {
      AudioFX.play('swap');
      await this.ui.animSwap(a, b);
      this.board.swapTiles(a, b);

      var wave;
      if (comboSwap) {
        wave = this.buildComboWave(a, b);
      } else if (prismSwap) {
        wave = this.buildPrismWave(a, b);
        this.stats.prismUsed = true;
      } else {
        wave = this.board.computeWave([a, b]);
      }

      if (!wave) {
        await this.ui.animSwapBack(a, b);
        this.board.swapTiles(a, b);
        AudioFX.play('swapFail');
        return;
      }

      await this.runTurn(wave);
    } catch (e) {
      if (window.console && console.error) console.error('[战斗流程异常]', e);
    } finally {
      // 关键修复：只要战斗没结束就恢复输入（含异常路径），防止棋盘永久锁死
      if (!this.over) {
        this.busy = false;
        this.ui.lockBoard(false);
        this.ui.emit('turnEnd');
      }
    }
  },

  /* 消耗一步并跑完整回合：波次连锁 → 死局重排 → 胜负 → 怪物回合 */
  runTurn: async function (wave) {
    this.movesLeft--;
    this.movesUsed = this.stats.movesUsed = this.level.moves + this.mods.moves - this.movesLeft;
    this.ui.updateMoves();
    this.ui.emit('moveUsed');

    var waveIdx = 0;
    while (wave) {
      waveIdx++;
      await this.applyWave(wave, waveIdx);
      if (this.over) return;
      wave = this.board.computeWave(null);
    }
    this.stats.maxWave = Math.max(this.stats.maxWave, waveIdx);

    // 死局重排
    if (!this.board.hasValidMove()) {
      this.board.shuffleBoard();
      await this.ui.reshuffleBoard();
    }

    if (this.allMonstersDead()) {
      if (this.waveIndex < this.waves.length - 1) await this.advanceWave();
      else { this.doWin(); return; }
    }

    await this.monsterTurn();
    if (this.over) return;

    if (this.hp <= 0) { this.doLose('hp'); return; }
    if (this.movesLeft <= 0 && !this.allMonstersDead()) { this.doLose('moves'); return; }
  },

  buildPrismWave: function (a, b) {
    var info = this.board.prismSwapCells(a, b);
    var createdIds = {};
    var ta = this.board.at(a.r, a.c), tb = this.board.at(b.r, b.c);
    // 被交换的棱镜自身不触发棱镜爆破
    var cells = [ta, tb];
    cells.forEach(function (t) { if (t && t.special === 'prism') createdIds[t.id] = true; });
    var result = this.board.expandSpecials(info.clear, createdIds);
    return {
      clearSet: result.clearSet,
      creations: [],
      createdIds: createdIds,
      triggers: result.triggers,
      runs: []
    };
  },

  /* 双特殊棋子组合交换的波次 */
  buildComboWave: function (a, b) {
    var combo = this.board.comboSwapClear(a, b);
    var createdIds = {};
    combo.tiles.forEach(function (t) { if (t) createdIds[t.id] = true; });
    // 组合范围引爆后，波及的其他特殊棋子继续连锁
    var result = this.board.expandSpecials(combo.clear, createdIds);
    var triggers = combo.fxTriggers.concat(result.triggers);
    var names = {
      prismAll: '棱镜·万物归一！',
      prismBombs: '棱镜·连环轰炸！',
      prismCross: '棱镜·十字风暴！',
      bombBomb: '双重炸弹·大爆炸！',
      bombCross: '炸弹×十字雷·交叉引爆！',
      crossCross: '十字雷·双重雷暴！'
    };
    if (names[combo.kind]) this.ui.toast(names[combo.kind], 1800);
    if (combo.kind.indexOf('prism') === 0) this.stats.prismUsed = true;
    return {
      clearSet: result.clearSet,
      creations: [],
      createdIds: createdIds,
      triggers: triggers,
      runs: []
    };
  },

  /* ============ 彩虹核心：点击激活（选择颜色后全场清除） ============ */
  activatePrism: async function (r, c, color) {
    if (this.busy || this.over) return;
    var tile = this.board.at(r, c);
    if (!tile || tile.special !== 'prism') return;

    // 场上无该颜色棋子则不消耗步数
    var count = 0;
    for (var rr = 0; rr < this.board.rows; rr++) {
      for (var cc = 0; cc < this.board.cols; cc++) {
        var t = this.board.grid[rr][cc];
        if (t && t.type === color) count++;
      }
    }
    if (count === 0) { this.ui.toast('场上没有这种颜色的棋子！', 1600); return; }

    this.busy = true;
    this.ui.lockBoard(true);
    try {
      AudioFX.play('prismCast');
      // 棱镜自身引爆特效
      this.ui.animTrigger({ r: r, c: c, special: 'prism' });
      await U.sleep(TIMING.trigger);

      var clear = {};
      clear[r + ',' + c] = { r: r, c: c };
      for (var r2 = 0; r2 < this.board.rows; r2++) {
        for (var c2 = 0; c2 < this.board.cols; c2++) {
          var t2 = this.board.grid[r2][c2];
          if (t2 && t2.type === color) clear[r2 + ',' + c2] = { r: r2, c: c2 };
        }
      }
      var createdIds = {};
      createdIds[tile.id] = true;
      var result = this.board.expandSpecials(clear, createdIds);
      var wave = {
        clearSet: result.clearSet,
        creations: [],
        createdIds: createdIds,
        triggers: result.triggers,
        runs: []
      };
      this.stats.prismUsed = true;

      await this.runTurn(wave);
    } catch (e) {
      if (window.console && console.error) console.error('[棱镜流程异常]', e);
    } finally {
      if (!this.over) {
        this.busy = false;
        this.ui.lockBoard(false);
        this.ui.emit('turnEnd');
      }
    }
  },

  /* ============ 波次执行 ============ */
  applyWave: async function (wave, waveIdx) {
    var self = this;
    AudioFX.play(waveIdx > 1 ? 'pop2' : 'pop', waveIdx);

    // 1) 生成特殊棋子
    if (wave.creations.length) {
      wave.creations.forEach(function (cr) {
        cr.tile.special = cr.special;
        if (cr.special === 'prism') cr.tile.type = -1;
        self.ui.animCreateSpecial(cr);
      });
      this.ui.emit('specialBorn', wave.creations);
      await U.sleep(360);
    }

    // 2) 引爆既有特殊棋子
    if (wave.triggers.length) {
      for (var i = 0; i < wave.triggers.length; i++) {
        var tr = wave.triggers[i];
        this.ui.animTrigger(tr);
        this.stats.bombsUsed++;
        AudioFX.play(tr.special === 'megaBomb' || tr.special === 'bombCross' ? 'megaBoom' : 'boom');
        this.ui.emit('bombTriggered', tr);
        await U.sleep(TIMING.trigger);
      }
    }

    if (waveIdx > 1) this.ui.showCombo(waveIdx);

    // 3) 伤害计算与飞行（按怪物+颜色合并，避免数字刷屏）
    var rawHits = this.computeHits(wave.clearSet, waveIdx);
    var merged = {};
    var order = [];
    rawHits.forEach(function (hit) {
      var k = hit.target.name + '|' + hit.color;
      if (!merged[k]) {
        merged[k] = { r: hit.r, c: hit.c, color: hit.color, target: hit.target, amount: 0, weak: hit.weak };
        order.push(merged[k]);
      }
      merged[k].amount += hit.amount;
      merged[k].weak = merged[k].weak || hit.weak;
    });
    var hits = order;
    var self2 = this;
    if (hits.length) {
      await this.ui.animProjectiles(hits, function (hit) { self2.applyDamage(hit); });
    }
    // 死亡
    var dead = this.monsters.filter(function (m) { return m.alive && m.hp <= 0; });
    if (dead.length) {
      await this.ui.animDeaths(dead);
      var heal = this.mods.killHeal;
      dead.forEach(function (m) {
        m.alive = false;
        self.stats.kills++;
        self.ui.emit('monsterDied', m);
      });
      if (heal > 0 && this.hp > 0) {
        this.distributeHeal(heal);
      }
    }

    // 4) 能量
    this.grantEnergy(wave);

    // 5) 消除动画 + 移除
    await this.ui.animPop(wave.clearSet);
    for (var k in wave.clearSet) {
      var cl = wave.clearSet[k];
      this.board.grid[cl.r][cl.c] = null;
    }

    // 6) 重力 + 补子
    var res = this.board.gravity();
    if (res.falls.length || res.spawns.length) {
      this.ui.animFall(res.falls);
      this.ui.animSpawn(res.spawns);
      await U.sleep(TIMING.fall + 60);
    }
  },

  /* ============ 数值 ============ */
  heroAtk: function (color) {
    return CONFIG.baseAtk * (1 + this.mods.atkAll + this.mods.atkColor[color]);
  },

  comboMultAt: function (waveIdx) {
    var arr = CONFIG.comboMults;
    var m = arr[Math.min(waveIdx - 1, arr.length - 1)];
    return Math.min(m + this.mods.comboCap, 3.8);
  },

  monsterAtColumn: function (col) {
    var alive = this.monsters.filter(function (m) { return m.alive; });
    if (!alive.length) return null;
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].cols.indexOf(col) >= 0) return alive[i];
    }
    return alive[0]; // 空列伤害转移给最左侧存活怪物
  },

  computeHits: function (clearSet, waveIdx) {
    var hits = [];
    var self = this;
    var combo = this.comboMultAt(waveIdx);
    var firstBonus = 1;
    if (waveIdx === 1 && !this.firstWaveUsed && this.mods.firstWave > 0) {
      firstBonus = 1 + this.mods.firstWave;
    }
    var waveDamage = 0;

    for (var k in clearSet) {
      var cl = clearSet[k];
      var tile = this.board.grid[cl.r][cl.c];
      if (!tile || tile.type === 'stone' || tile.type === -1) continue;
      var color = tile.type;
      var target = this.monsterAtColumn(cl.c);
      if (!target) continue;

      var mult = combo * firstBonus;
      var weak = false;
      if (color === target.weak) {
        mult *= (CONFIG.weakMult + this.mods.weakBonus);
        weak = true;
      } else if (color === target.resist) {
        mult *= CONFIG.resistMult;
      }
      if (target.hp / target.hpMax <= 0.3 && this.mods.execute > 0) mult *= (1 + this.mods.execute);

      var dmg = Math.max(1, Math.round(this.heroAtk(color) * mult));
      waveDamage += dmg;
      hits.push({ r: cl.r, c: cl.c, color: color, target: target, amount: dmg, weak: weak });
    }
    if (waveIdx === 1 && this.mods.firstWave > 0) this.firstWaveUsed = true;
    this.stats.maxWaveDamage = Math.max(this.stats.maxWaveDamage, Math.round(waveDamage));
    return hits;
  },

  applyDamage: function (hit) {
    var m = hit.target;
    if (!m.alive) return;
    var dmg = hit.amount;
    if (m.shield > 0) {
      var absorbed = Math.min(m.shield, dmg);
      m.shield -= absorbed;
      dmg -= absorbed;
      this.ui.updateMonsterShield(m);
    }
    m.hp -= dmg;
    this.stats.damageDealt += hit.amount;
    if (hit.weak) this.stats.weakHits++;
    this.ui.showDamage(m, hit.amount, hit);
    this.ui.updateMonsterHp(m);
    if (hit.weak) AudioFX.play('weak'); else AudioFX.play('hit');
  },

  grantEnergy: function (wave) {
    var self = this;
    var counts = [0, 0, 0, 0, 0];
    for (var k in wave.clearSet) {
      var cl = wave.clearSet[k];
      var tile = this.board.grid[cl.r][cl.c];
      if (!tile || tile.type === 'stone' || tile.type === -1) continue;
      counts[tile.type]++;
    }
    var bonus = 0;
    (wave.runs || []).forEach(function (run) {
      if (run.cells.length > 3) bonus += (run.cells.length - 3) * CONFIG.match4Bonus;
    });
    var gained = false;
    for (var c = 0; c < 5; c++) {
      if (counts[c] <= 0) continue;
      var amount = counts[c] * CONFIG.energyPerTile * this.modsEnergyGain + (bonus / 5);
      var h = this.heroes[c];
      var before = h.energy;
      h.energy = Math.min(CONFIG.energyCap, h.energy + amount);
      if (h.energy >= CONFIG.energyCap && before < CONFIG.energyCap) {
        this.ui.emit('energyFull', h);
      }
      gained = true;
    }
    if (gained) {
      this.ui.flyEnergy(counts);
      this.ui.updateEnergy();
      AudioFX.play('energy');
    }
  },

  allMonstersDead: function () {
    return this.monsters.every(function (m) { return !m.alive; });
  },

  /* ============ 怪物回合 ============ */
  monsterTurn: async function () {
    var self = this;
    for (var i = 0; i < this.monsters.length; i++) {
      var m = this.monsters[i];
      if (!m.alive) continue;
      if (m.hp <= 0) continue;

      if (m.frozen > 0) {
        m.frozen--;
        this.ui.updateFrozen(m);
        if (m.frozen > 0) continue;
      }
      m.cdLeft--;
      this.ui.updateTelegraph(m);
      if (m.cdLeft > 0) continue;

      await this.executeMonsterMove(m);
      if (this.over) return;
      if (!m.alive) continue;
      m.cdLeft = m.cd;
      m.nextMove = this.pickMove(m);
      this.ui.updateTelegraph(m);
      await U.sleep(160);
    }
    // 回合回复（分给最虚弱的英雄）
    if (this.mods.regen > 0 && this.hp > 0 && this.hp < this.hpMax) {
      this.distributeHeal(this.mods.regen);
    }
  },

  pickMove: function (m) {
    var self = this;
    var pool = (m.moves || ['strike']).filter(function (mv) {
      if (mv === 'summon') {
        return self.freeColumn() >= 0 && self.monsters.filter(function (x) { return x.alive; }).length < 4;
      }
      return true;
    });
    if (pool.length === 1) return pool[0];
    if (!pool.length) return 'strike';
    // 攻击权重高，技能偶尔
    var r = this.rng();
    if (r < 0.55) return 'strike';
    return pool[1 + Math.floor(this.rng() * (pool.length - 1))];
  },

  executeMonsterMove: async function (m) {
    var self = this;
    AudioFX.play('monsterAct');
    switch (m.nextMove) {
      case 'strike': {
        var t1 = this.pickHeroTarget();
        await this.ui.monsterAct(m, 'strike', m.atk * (1 + m.buffAtk), t1 ? t1.idx : null);
        this.playerHit(m, m.atk * (1 + m.buffAtk), t1 ? t1.idx : null);
        break;
      }
      case 'heavy': {
        var t2 = this.pickHeroTarget();
        await this.ui.monsterAct(m, 'heavy', m.atk * 1.8 * (1 + m.buffAtk), t2 ? t2.idx : null);
        this.playerHit(m, m.atk * 1.8 * (1 + m.buffAtk), t2 ? t2.idx : null);
        break;
      }
      case 'shield': {
        var amt = Math.round(15 + this.n * 0.5);
        m.shield += amt;
        await this.ui.monsterAct(m, 'shield', amt);
        break;
      }
      case 'curse': {
        var cells = this.pickCurseCells(2);
        if (cells.length) {
          var self2 = this;
          cells.forEach(function (cl) { self2.board.makeStone(cl.r, cl.c); });
          await this.ui.monsterAct(m, 'curse', cells);
          this.ui.convertStones(cells);
        } else {
          var tf1 = this.pickHeroTarget();
          await this.ui.monsterAct(m, 'strike', m.atk, tf1 ? tf1.idx : null);
          this.playerHit(m, m.atk, tf1 ? tf1.idx : null);
        }
        break;
      }
      case 'summon': {
        var col = this.freeColumn();
        if (col >= 0 && this.monsters.filter(function (x) { return x.alive; }).length < 4) {
          var spec = {
            family: 'sprout', name: '小萌芽', size: 1, cols: [col],
            hp: Math.round(18 + this.n * 2.2), atk: Math.round(3 + this.n * 0.12), cd: 3,
            weak: Math.floor(this.rng() * 5), resist: -1,
            moves: ['strike'], tint: '#A5D6AE', isBoss: false, isMinion: true
          };
          spec.hpMax = spec.hp;
          spec.cdLeft = spec.cd; spec.frozen = 0; spec.shield = 0; spec.buffAtk = 0;
          spec.alive = true; spec.nextMove = 'strike'; spec.telegraphed = false;
          this.monsters.push(spec);
          await this.ui.monsterAct(m, 'summon', spec);
          this.ui.emit('summoned', spec);
        } else {
          var tf2 = this.pickHeroTarget();
          await this.ui.monsterAct(m, 'strike', m.atk, tf2 ? tf2.idx : null);
          this.playerHit(m, m.atk, tf2 ? tf2.idx : null);
        }
        break;
      }
      case 'buff':
        m.buffAtk = Math.min(0.9, m.buffAtk + 0.3);
        await this.ui.monsterAct(m, 'buff', null);
        break;
      case 'heal': {
        var allies = this.monsters.filter(function (x) { return x.alive && x.hp > 0; });
        var target = null;
        allies.forEach(function (a) {
          if (!target || a.hp / a.hpMax < target.hp / target.hpMax) target = a;
        });
        if (target) {
          var amt = Math.round(target.hpMax * 0.15);
          target.hp = Math.min(target.hpMax, target.hp + amt);
          await this.ui.monsterAct(m, 'heal', { target: target, amount: amt });
        }
        break;
      }
    }
  },

  pickCurseCells: function (count) {
    var candidates = [];
    for (var r = 0; r < this.board.rows; r++) {
      for (var c = 0; c < this.board.cols; c++) {
        var t = this.board.grid[r][c];
        if (t && t.type !== 'stone' && !t.special) candidates.push({ r: r, c: c });
      }
    }
    candidates = U.shuffle(this.rng, candidates);
    return candidates.slice(0, count);
  },

  freeColumn: function () {
    var occupied = {};
    this.monsters.forEach(function (m) {
      if (m.alive) m.cols.forEach(function (c) { occupied[c] = true; });
    });
    var free = [];
    for (var c = 0; c < CONFIG.COLS; c++) if (!occupied[c]) free.push(c);
    if (!free.length) return -1;
    return free[Math.floor(this.rng() * free.length)];
  },

  /* ============ 英雄生命 ============ */
  heroAt: function (idx) {
    var h = this.heroes[idx];
    return (h && !h.ko && h.hp > 0) ? h : null;
  },

  // 怪物攻击目标：优先能量最高的存活英雄（促使玩家及时放技能）
  pickHeroTarget: function () {
    var alive = this.heroes.filter(function (h) { return !h.ko && h.hp > 0; });
    if (!alive.length) return this.heroes[0];
    var best = alive[0];
    for (var i = 1; i < alive.length; i++) {
      if (alive[i].energy > best.energy) best = alive[i];
    }
    return best;
  },

  syncHp: function () {
    var sum = 0;
    this.heroes.forEach(function (h) { sum += Math.max(0, h.hp); });
    this.hp = sum;
  },

  playerHit: function (m, rawAmount, heroIdx) {
    if (this.over) return;
    var dmg = Math.round(rawAmount * (1 - Math.min(0.6, this.mods.dmgTaken)));
    var t = this.heroAt(heroIdx) || this.pickHeroTarget();
    if (this.shield > 0) {
      var absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0 && t) this.ui.floatPlayerText('护盾 -' + absorbed, 'shield', t.idx);
    }
    if (dmg > 0 && t) {
      var wasKo = t.ko;
      t.hp = Math.max(0, t.hp - dmg);
      this.stats.totalHurt += dmg;
      this.ui.floatPlayerText('-' + dmg, 'hurt', t.idx);
      if (t.hp <= 0 && !wasKo) {
        t.ko = true;
        this.ui.heroKO(t.idx);
      } else {
        this.ui.updateHeroHp(t.idx);
      }
    }
    this.syncHp();
    this.ui.updateHp();
    this.ui.updateShield();
    this.ui.playerHurt(t ? t.idx : null);
  },

  // 治疗量分给最虚弱的英雄（可救回晕厥者）
  distributeHeal: function (amount) {
    var left = amount, given = 0;
    while (left > 0) {
      var target = null;
      this.heroes.forEach(function (h) {
        if (h.hp < h.hpMax && (!target || h.hp < target.hp)) target = h;
      });
      if (!target) break;
      var give = Math.min(target.hpMax - target.hp, left);
      var wasKo = target.ko;
      target.hp += give;
      left -= give;
      given += give;
      if (target.hp > 0 && wasKo) {
        target.ko = false;
        this.ui.heroRevive(target.idx);
      } else {
        this.ui.updateHeroHp(target.idx);
      }
    }
    if (given > 0) {
      this.syncHp();
      this.ui.updateHp();
      this.ui.floatPlayerText('+' + given, 'heal');
    }
  },

  /* ============ 英雄技能 ============ */
  castSkill: async function (heroIdx) {
    if (this.busy || this.over) return;
    var h = this.heroes[heroIdx];
    if (!h) return;
    if (h.ko) {
      this.ui.toast(h.def.name + ' 已晕厥，无法释放技能！', 1800);
      this.ui.flashHero(heroIdx, false);
      return;
    }
    if (h.energy < CONFIG.energyCap) {
      this.ui.flashHero(heroIdx, false);
      return;
    }
    this.busy = true;
    this.ui.lockBoard(true);
    try {
    h.energy = this.mods.skillKeep || 0;
    this.stats.skillCasts++;
    AudioFX.play('skill');
    await this.ui.heroCastFX(h);

    var self = this;
    var alive = this.monsters.filter(function (m) { return m.alive; });

    function skillDamage(color, target, base) {
      var mult = 1;
      if (color === target.weak) mult = CONFIG.weakMult + this.mods.weakBonus;
      else if (color === target.resist) mult = CONFIG.resistMult;
      return Math.max(1, Math.round(this.heroAtk(color) * base * mult));
    }

    switch (h.def.cast) {
      case 'burst': {
        var target = null;
        alive.forEach(function (m) { if (!target || m.hp > target.hp) target = m; });
        if (target) {
          var dmg = skillDamage.call(this, 0, target, 7);
          await this.ui.skillHit(h, target, dmg, 0);
          this.applyDamage({ target: target, amount: dmg, weak: target.weak === 0, color: 0 });
        }
        break;
      }
      case 'freeze': {
        var dmgF = 0;
        for (var i = 0; i < alive.length; i++) {
          var m = alive[i];
          m.cdLeft += 2;
          m.frozen += 2;
          dmgF = skillDamage.call(this, 1, m, 2);
          this.applyDamage({ target: m, amount: dmgF, weak: m.weak === 1, color: 1 });
          this.ui.updateFrozen(m);
          this.ui.updateTelegraph(m);
        }
        AudioFX.play('freeze');
        break;
      }
      case 'shield': {
        this.shield += 40;
        this.ui.updateShield();
        this.ui.floatPlayerText('护盾 +40', 'shield');
        AudioFX.play('shield');
        break;
      }
      case 'heal': {
        this.distributeHeal(45);
        AudioFX.play('heal');
        break;
      }
      case 'slashAll': {
        for (var j = 0; j < alive.length; j++) {
          var mm = alive[j];
          var dmgS = skillDamage.call(this, 4, mm, 2.5);
          await this.ui.skillHit(h, mm, dmgS, 4);
          this.applyDamage({ target: mm, amount: dmgS, weak: mm.weak === 4, color: 4 });
        }
        break;
      }
    }

    this.ui.updateEnergy();
    this.ui.emit('skillCast', h);

    // 死亡结算
    var dead = this.monsters.filter(function (m) { return m.alive && m.hp <= 0; });
    if (dead.length) {
      await this.ui.animDeaths(dead);
      dead.forEach(function (m) {
        m.alive = false;
        self.stats.kills++;
      });
    }

    if (this.allMonstersDead()) {
      if (this.waveIndex < this.waves.length - 1) await this.advanceWave();
      else { this.doWin(); return; }
    }
    if (this.hp <= 0) { this.doLose('hp'); return; }
    } catch (e) {
      if (window.console && console.error) console.error('[技能流程异常]', e);
    } finally {
      // 战斗未结束时必须恢复输入（含异常路径），防止棋盘锁死
      if (!this.over) {
        this.busy = false;
        this.ui.lockBoard(false);
        this.ui.emit('turnEnd');
      }
    }
  },

  /* ============ 胜负 ============ */
  doWin: function () {
    if (this.over) return;
    this.over = true;
    this.winFlag = true;
    this.busy = true;
    this.stats.movesLeft = this.movesLeft;
    this.stats.movesUsed = this.movesUsed;
    AudioFX.play('win');
    var self = this;

    // 星级
    var stars = 1;
    var objResults = this.level.objectives.map(function (key) {
      var def = DATA.OBJECTIVES[key];
      var done = def.check(self.stats);
      if (done) stars++;
      return { key: key, def: def, done: done };
    });

    var score = this.stats.damageDealt + this.stats.kills * 300 +
      this.stats.movesLeft * 80 + this.stats.maxWave * 40 + stars * 100;
    var save = DATA.save;
    var isBest = score > (save.best[this.n] || 0);
    if (isBest) save.best[this.n] = score;

    // 存档
    if (this.n >= save.unlocked) save.unlocked = Math.min(60, this.n + 1);
    var oldStars = save.stars[this.n] || 0;
    if (stars > oldStars) save.stars[this.n] = stars;
    // 远征推进
    var nextLevel = Math.min(60, this.n + 1);
    var heal = Math.round(this.hpMax * CONFIG.healBetweenLevels);
    save.run = {
      level: nextLevel,
      hp: Math.min(this.hpMax, this.hp + heal),
      shield: this.shield,
      blessings: (this.runState ? this.runState.blessings.slice() : [])
    };
    DATA.persist();
    this.ui.showResult(true, stars, score, objResults, this.stats, null, isBest);
    this.ui.emit('win');
  },

  doLose: function (reason) {
    if (this.over) return;
    this.over = true;
    this.busy = true;
    AudioFX.play('lose');
    var save = DATA.save;
    save.run = null;
    DATA.persist();
    this.stats.movesLeft = this.movesLeft;
    this.stats.movesUsed = this.movesUsed;
    this.ui.showResult(false, 0, 0, [], this.stats, reason);
    this.ui.emit('lose');
  }
};
