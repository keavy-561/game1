import { U } from './util.js';

/* ==========================================================
   游戏数据：配置 / 英雄 / 怪物 / 祝福 / 60 关生成
   ========================================================== */
var CONFIG = {
  COLS: 6,
  ROWS: 8,
  COLORS: 5,
  playerHp: 110,
  baseAtk: 7,            // 每颗棋子的基础伤害
  energyCap: 100,
  energyPerTile: 12,
  weakMult: 1.6,
  resistMult: 0.75,
  comboMults: [1, 1.25, 1.5, 1.8, 2.2, 2.6, 3.0],
  match4Bonus: 6,        // 4连以上每多一颗额外能量
  healBetweenLevels: 0.35, // 通关后按上限回复比例
  colors: ['r', 'b', 'g', 'y', 'p']
};

var DATA = (function () {

  /* ---------- 属性 ---------- */
  var COLOR_INFO = [
    { key: 'r', cn: '花瓣', elem: '炎', hex: '#F2766B' },
    { key: 'b', cn: '水滴', elem: '潮', hex: '#57B2E3' },
    { key: 'g', cn: '叶片', elem: '风', hex: '#6DC087' },
    { key: 'y', cn: '星星', elem: '光', hex: '#F5B93F' },
    { key: 'p', cn: '月牙', elem: '月', hex: '#A78FD9' }
  ];

  /* ---------- 英雄 ---------- */
  var HEROES = [
    {
      id: 'hong', color: 0, name: '绯樱', title: '花剑士',
      skill: '绯樱百华', skillDesc: '对当前血量最高的敌人造成 7 倍攻击的伤害',
      cast: 'burst'
    },
    {
      id: 'lan', color: 1, name: '澜', title: '潮汐法师',
      skill: '潮汐冻结', skillDesc: '全体敌人延后 2 回合并各受 2 倍攻击伤害',
      cast: 'freeze'
    },
    {
      id: 'ya', color: 2, name: '芽', title: '翠藤守卫',
      skill: '翠藤护壁', skillDesc: '获得 40 点护盾，抵挡怪物伤害',
      cast: 'shield'
    },
    {
      id: 'liang', color: 3, name: '亮', title: '星辉牧师',
      skill: '星辉恩泽', skillDesc: '立即恢复全队 45 点生命',
      cast: 'heal'
    },
    {
      id: 'ying', color: 4, name: '影', title: '月影游侠',
      skill: '月影连斩', skillDesc: '对所有敌人各造成 2.5 倍攻击伤害',
      cast: 'slashAll'
    }
  ];

  /* ---------- 怪物家族 ---------- */
  var FAMILY = {
    fluff:    { names: ['绒绒', '球球', '团团', '毛毛'], sizes: [1, 2], tint: ['#F8CFC4', '#F9D9C9', '#F3C7DE'] },
    mushroom: { names: ['菇菇', '伞伞', '蘑蘑', '墩墩'], sizes: [1, 2], tint: ['#EE9C8A', '#E8A5B8', '#EDA97E'] },
    jelly:    { names: ['泡泡', '果冻', '水水', '啵啵'], sizes: [1, 2], tint: ['#8CC8EE', '#9ED0F0', '#8FBBEA'] },
    golem:    { names: ['石石', '岩仔', '砖砖', '咕岩'], sizes: [2, 3], tint: ['#B7ACD6', '#C4BCDC', '#A9A3D0'] },
    cloudbird:{ names: ['云云', '雀雀', '朵朵', '风风'], sizes: [1, 2], tint: ['#EDEFF2', '#E8E3EF', '#F0EADB'] },
    roseking: { names: ['荆棘王'], sizes: [4], tint: ['#C9556E'] },
    sprout:   { names: ['小萌芽'], sizes: [1], tint: ['#A5D6AE'] }
  };

  /* ---------- 章节 ---------- */
  var CHAPTERS = [
    { name: '花语草原', sub: '微风与蒲公英的故乡', pool: ['fluff'], boss: { family: 'fluff', name: '花王·绒球', size: 4 }, tier: ['strike', 'heavy', 'shield'] },
    { name: '露水森林', sub: '蘑菇在树影下悄悄生长', pool: ['mushroom', 'fluff'], boss: { family: 'mushroom', name: '蘑菇长老', size: 4 }, tier: ['strike', 'heavy', 'shield'] },
    { name: '星光湖畔', sub: '湖面倒映着星星', pool: ['jelly', 'mushroom'], boss: { family: 'jelly', name: '深湖泡影', size: 4 }, tier: ['strike', 'heavy', 'curse'] },
    { name: '月影洞窟', sub: '月亮在洞顶安静发光', pool: ['golem', 'jelly'], boss: { family: 'golem', name: '洞窟石像', size: 4 }, tier: ['strike', 'heavy', 'summon', 'shield'] },
    { name: '风暴崖顶', sub: '风在这里学会飞翔', pool: ['cloudbird', 'golem'], boss: { family: 'cloudbird', name: '云端之王', size: 4 }, tier: ['strike', 'heavy', 'buff', 'heal', 'summon'] },
    { name: '终焉花园', sub: '旅程尽头的花，正在等你', pool: ['roseking', 'cloudbird', 'golem', 'jelly', 'mushroom', 'fluff'], boss: { family: 'roseking', name: '终焉荆棘王', size: 4 }, tier: ['strike', 'heavy', 'curse', 'summon', 'buff', 'heal', 'shield'] }
  ];

  /* ---------- 怪物技能 ---------- */
  var MONSTER_MOVES = {
    strike: { icon: 'sword', label: '攻击', desc: '攻击你，造成基础伤害', cls: 't-attack' },
    heavy:  { icon: 'swordHeavy', label: '重击', desc: '下次攻击造成 1.8 倍伤害', cls: 't-heavy' },
    shield: { icon: 'shield', label: '护盾', desc: '为自己附加护盾，抵挡伤害', cls: 't-shield' },
    curse:  { icon: 'curse', label: '石化', desc: '将棋盘上的棋子变成石块', cls: 't-curse' },
    summon: { icon: 'summon', label: '召唤', desc: '召唤一只小萌芽加入战场', cls: 't-summon' },
    buff:   { icon: 'up', label: '强化', desc: '攻击力提升 30%', cls: 't-buff' },
    heal:   { icon: 'heart', label: '治疗', desc: '治疗受伤最重的同伴', cls: 't-heal' }
  };

  /* ---------- 祝福（Roguelike 强化） ---------- */
  var BLESSINGS = [
    { id: 'atkAll', name: '繁花之力', icon: 'sparkle', mod: { atkAll: .10 }, desc: '所有消除伤害 +10%' },
    { id: 'atkR', name: '花瓣之刃', icon: 'petalIc', mod: { atkColor0: .12 }, desc: '花瓣（炎）伤害 +12%' },
    { id: 'atkB', name: '潮汐之刃', icon: 'dropIc', mod: { atkColor1: .12 }, desc: '水滴（潮）伤害 +12%' },
    { id: 'atkG', name: '翠叶之刃', icon: 'leafIc', mod: { atkColor2: .12 }, desc: '叶片（风）伤害 +12%' },
    { id: 'atkY', name: '星辉之刃', icon: 'star', mod: { atkColor3: .12 }, desc: '星星（光）伤害 +12%' },
    { id: 'atkP', name: '月影之刃', icon: 'moonIc', mod: { atkColor4: .12 }, desc: '月牙（月）伤害 +12%' },
    { id: 'energyUp', name: '共鸣之种', icon: 'gauge', mod: { energyGain: .20 }, desc: '能量获取 +20%' },
    { id: 'shieldStart', name: '晨露护壁', icon: 'shield', mod: { startShield: 20 }, desc: '每场战斗开始获得 20 护盾' },
    { id: 'hpMax', name: '大地之息', icon: 'heart', mod: { hpMax: 25 }, desc: '生命上限 +25，并立即回复 25' },
    { id: 'regen', name: '绵绵春雨', icon: 'healIc', mod: { regen: 3 }, desc: '每回合结束回复 3 生命' },
    { id: 'comboCap', name: '连锁星辰', icon: 'prism', mod: { comboCap: .8 }, desc: '连消伤害倍率上限 +0.8' },
    { id: 'weakUp', name: '弱点看破', icon: 'swordHeavy', mod: { weakBonus: .25 }, desc: '命中弱点时额外 +25% 伤害' },
    { id: 'movesUp', name: '时之沙', icon: 'clock', mod: { moves: 2 }, desc: '每关步数 +2' },
    { id: 'killHeal', name: '胜利之息', icon: 'heart', mod: { killHeal: 15 }, desc: '击败怪物时回复 15 生命' },
    { id: 'skillKeep', name: '余韵', icon: 'gauge', mod: { skillKeep: 30 }, desc: '释放技能后保留 30 能量' },
    { id: 'startFull', name: '晨星祝福', icon: 'sparkle', mod: { startFull: 1 }, desc: '每场开始时随机一名英雄能量全满' },
    { id: 'firstRound', name: '先手花语', icon: 'flame', mod: { firstWave: .5 }, desc: '每场第一次消除伤害 +50%' },
    { id: 'execute', name: '终结之月', icon: 'moonIc', mod: { execute: .30 }, desc: '对生命低于 30% 的敌人伤害 +30%' },
    { id: 'resistUp', name: '柔风羽衣', icon: 'shield', mod: { dmgTaken: .12 }, desc: '受到的伤害 -12%' },
    { id: 'freezeStart', name: '迟缓花雾', icon: 'freeze', mod: { startFreeze: 1 }, desc: '每场开始所有敌人行动延后 1 回合' }
  ];
  var BLESS_MAP = {};
  BLESSINGS.forEach(function (b) { BLESS_MAP[b.id] = b; });

  function modsFromBlessings(ids) {
    var m = {
      atkAll: 0, atkColor: [0, 0, 0, 0, 0], energyGain: 0, startShield: 0, hpMax: 0, regen: 0,
      comboCap: 0, weakBonus: 0, moves: 0, killHeal: 0, skillKeep: 0, startFull: 0,
      firstWave: 0, execute: 0, dmgTaken: 0, startFreeze: 0
    };
    (ids || []).forEach(function (id) {
      var b = BLESS_MAP[id]; if (!b) return;
      var mm = b.mod;
      if (mm.atkAll) m.atkAll += mm.atkAll;
      for (var i = 0; i < 5; i++) if (mm['atkColor' + i]) m.atkColor[i] += mm['atkColor' + i];
      if (mm.energyGain) m.energyGain += mm.energyGain;
      if (mm.startShield) m.startShield += mm.startShield;
      if (mm.hpMax) m.hpMax += mm.hpMax;
      if (mm.regen) m.regen += mm.regen;
      if (mm.comboCap) m.comboCap += mm.comboCap;
      if (mm.weakBonus) m.weakBonus += mm.weakBonus;
      if (mm.moves) m.moves += mm.moves;
      if (mm.killHeal) m.killHeal += mm.killHeal;
      if (mm.skillKeep) m.skillKeep += mm.skillKeep;
      if (mm.startFull) m.startFull += mm.startFull;
      if (mm.firstWave) m.firstWave += mm.firstWave;
      if (mm.execute) m.execute += mm.execute;
      if (mm.dmgTaken) m.dmgTaken += mm.dmgTaken;
      if (mm.startFreeze) m.startFreeze += mm.startFreeze;
    });
    return m;
  }

  /* ---------- 隐藏目标 ---------- */
  var OBJECTIVES = {
    movesLeft: { desc: '剩余步数 ≥ 5', check: function (s) { return s.movesLeft >= 5; }, icon: 'clock' },
    combo3:    { desc: '单次行动 3 波连消', check: function (s) { return s.maxWave >= 3; }, icon: 'prism' },
    skills2:   { desc: '释放 2 次技能', check: function (s) { return s.skillCasts >= 2; }, icon: 'sparkle' },
    bombs3:    { desc: '引爆 3 枚炸弹', check: function (s) { return s.bombsUsed >= 3; }, icon: 'bomb' },
    prismUse:  { desc: '使用一枚棱镜', check: function (s) { return s.prismUsed; }, icon: 'prism' },
    dmg60:     { desc: '单波伤害 ≥ 60', check: function (s) { return s.maxWaveDamage >= 60; }, icon: 'attack' },
    hurt20:    { desc: '全程受伤 ≤ 20', check: function (s) { return s.totalHurt <= 20; }, icon: 'shield' },
    weak8:     { desc: '命中弱点 8 次', check: function (s) { return s.weakHits >= 8; }, icon: 'swordHeavy' },
    fast10:    { desc: '10 步内获胜', check: function (s) { return s.movesUsed <= 10; }, icon: 'flame' }
  };
  var OBJ_KEYS = Object.keys(OBJECTIVES);

  /* ---------- 关卡生成（确定性） ---------- */
  var PARTITIONS = [[3, 2, 1], [2, 2, 2], [3, 3], [2, 2, 1, 1], [1, 1, 2, 2], [2, 1, 2, 1], [1, 3, 2], [2, 1, 3], [1, 2, 2, 1], [3, 1, 1, 1]];

  function buildLevel(n) {
    var rng = U.rng(n * 9973 + 17);
    var chIdx = Math.floor((n - 1) / 10);
    var ch = CHAPTERS[chIdx];
    var isBoss = n % 10 === 0;
    var tutorial = n === 1;

    /* 波次难度：第 1-4 关单波，5-9 关两波，第 10 关起三波；
       每 5 关的最终波出现超级大 BOSS（章节关 = 本章之王，其余 = 精英） */
    var waveCount = n <= 4 ? 1 : (n <= 9 ? 2 : 3);
    var superBoss = (n % 5 === 0);

    var level = {
      n: n, chapter: chIdx, chapterName: ch.name, isBoss: isBoss, tutorial: tutorial,
      waves: [], objectives: [], moves: 20, startEnergy: 0, playerHp: CONFIG.playerHp
    };

    var totalHp;
    if (tutorial) {
      totalHp = 255; // ×0.9 后约 230，适配教程节奏
      level.moves = 20;
      level.startEnergy = 65;
    } else {
      /* 难度曲线：1-4 关保持宽松（上手期）；5 关起线性加码；
         10 关起叠加超线性项（0.85·(n-9)^1.55）；
         步数按「每步需求伤害 20+0.35n」反推——需求随关卡稳步上升，
         通关不再是白给的（还要配合封印元素与更强的怪物攻击）。 */
      totalHp = 240 + (n <= 4 ? 17 : 20) * n + Math.floor(0.85 * Math.pow(Math.max(0, n - 9), 1.55));
      level.moves = U.clamp(Math.ceil(totalHp / (20 + 0.35 * n)) + (n <= 9 ? 1 : 0), 12, 46);
    }

    // 每波 HP 预算占比（最终波最重）
    var shares = waveCount === 1 ? [1] : (waveCount === 2 ? [0.42, 0.58] : [0.28, 0.28, 0.44]);

    for (var wi = 0; wi < waveCount; wi++) {
      var isFinal = wi === waveCount - 1;
      var budget = Math.round(totalHp * shares[wi]);

      var sizes, families = [];
      if (tutorial) {
        sizes = [2];
        families = ['fluff'];
      } else if (isFinal && isBoss) {
        // 章节 BOSS：本章之王 + 两只小萌芽
        sizes = [4, 1, 1];
        families = [ch.boss.family, 'sprout', 'sprout'];
      } else if (isFinal && superBoss) {
        // 精英超级 BOSS：大体型精英 + 两只随从
        sizes = [4, 2];
        var eFam = U.choice(rng, ch.pool);
        if (eFam === 'roseking') eFam = 'fluff';
        families = [eFam, 'sprout'];
      } else {
        var parts = U.shuffle(rng, PARTITIONS.filter(function (p) { return p.length <= 4 && Math.max.apply(null, p) <= 3; }));
        sizes = parts[0];
        for (var i = 0; i < sizes.length; i++) {
          var fam = U.choice(rng, ch.pool);
          if (fam === 'roseking') fam = 'fluff'; // 普通关不出现终焉王
          families.push(fam);
        }
      }

      // 列分配（教程怪从第 2 列起：引导消除恰好命中它）
      var col = tutorial ? 2 : 0;
      var weakBag = tutorial ? [0, 1, 2, 3, 4] : U.shuffle(rng, [0, 1, 2, 3, 4]);
      var hpShare = [];
      var sizeSum = sizes.reduce(function (a, b) { return a + b; }, 0);
      sizes.forEach(function (s) { hpShare.push(budget * (s / sizeSum)); });

      var wave = [];
      for (var mi = 0; mi < sizes.length; mi++) {
        var s = sizes[mi];
        var fam = families[mi];
        var fd = FAMILY[fam];
        var isBossM = isBoss && isFinal && mi === 0;
        var isElite = superBoss && isFinal && mi === 0 && !isBossM;
        var name = isBossM ? ch.boss.name : (isElite ? '精英·' + U.choice(rng, fd.names) : U.choice(rng, fd.names));
        var cols = [];
        for (var c = 0; c < s; c++) { cols.push(col); col++; }

        var hp = Math.round(hpShare[mi] * (isBossM ? 1 : isElite ? 1.15 : 0.9) + (isBossM ? 30 : isElite ? 20 : 0));
        var atk = Math.round((5 + 0.26 * n) * (s === 1 ? 0.85 : 1) * (isBossM ? 1.15 : isElite ? 1.1 : 1));
        var cd = isBossM ? 4 : (fd.sizes[0] >= 2 ? 3 : 4);
        if (fam === 'golem') cd = 4;
        if (isElite) cd = 3;

        var moves = ['strike'];
        if (!tutorial) {
          var extra = U.shuffle(rng, ch.tier.filter(function (t) { return t !== 'strike'; }));
          var count = 1 + Math.min(2, Math.floor((n - 1) / 18)) + ((isBossM || isElite) ? 1 : 0);
          moves = ['strike'].concat(extra.slice(0, count));
          if (isBossM || isElite) moves.push('heavy');
        }

        wave.push({
          family: fam, name: name, size: s, cols: cols,
          hp: hp, hpMax: hp, atk: atk, cd: cd,
          weak: weakBag[mi % 5], resist: tutorial ? 4 : (weakBag[mi % 5] + 2) % 5,
          moves: moves, tint: U.choice(rng, fd.tint),
          isBoss: isBossM, isElite: isElite, isMinion: fam === 'sprout'
        });
      }
      level.waves.push(wave);
    }

    level.monsters = level.waves[0]; // 兼容旧引用

    // 隐藏目标
    if (tutorial) {
      level.objectives = ['movesLeft', 'skills2'];
    } else {
      var keys = U.shuffle(rng, OBJ_KEYS.filter(function (k) { return k !== 'fast10' || totalHp < 300; }));
      level.objectives = keys.slice(0, 2);
    }

    /* 封印元素（渐进难度）：被封印的颜色消除后不造成伤害、不积攒能量（见 computeHits / grantEnergy），
       但照常消耗步数、怪物照常行动。节奏：
       1-16 无 → 17-19 首尝 1 色 → 20-29 章奇数关 1 色 → 30 起整章 1 色
       → 30+ 精英关与 46+ 加码 2 色 → 55 起含终焉之王全 2 色（章节 BOSS 关减量照顾） */
    var sealCount = 0;
    if (n >= 10 && n <= 19) sealCount = (n >= 17) ? 1 : 0;
    else if (n >= 20 && n <= 29) sealCount = (n % 2 === 1) ? 1 : 0;
    else if (n >= 30 && n <= 39) sealCount = (n % 5 === 0 && n % 10 !== 0) ? 2 : 1;
    else if (n >= 40 && n <= 49) sealCount = (n % 10 !== 0 && (n % 5 === 0 || n >= 46)) ? 2 : 1;
    else if (n >= 50 && n <= 54) sealCount = 1;
    else if (n >= 55) sealCount = 2;
    level.sealed = sealCount > 0 ? U.shuffle(rng, [0, 1, 2, 3, 4]).slice(0, sealCount) : [];
    return level;
  }

  /* ---------- 存档：设备码隔离 + 双键冗余 + 旧档自动迁移 ----------
     每台设备生成稳定「设备码」；存档同时写入设备码主键与备份键两份；
     读取时在 主键 / 备份键 / 旧版键 中取最新的有效存档——任何一处损坏都不丢进度，
     用户不主动「重新开始」就永远接着上一次的进度玩。 */
  var DEVICE_KEY = 'bloom_tale_device_v1';
  var LEGACY_KEY = 'bloom_tale_save_v1'; // 旧版单键存档，自动迁移
  var save = null;
  var deviceCode = null;

  // 设备码：首次用设备特征哈希生成，之后永远复用已存值（浏览器升级也不变）
  function fingerprintHash() {
    var s = (navigator.userAgent || '') + '|' + (navigator.language || '') + '|' +
      (navigator.platform || '') + '|' + (screen.width || 0) + 'x' + (screen.height || 0) +
      'x' + (screen.colorDepth || 0) + '|' + (navigator.hardwareConcurrency || 0) + '|' +
      (new Date().getTimezoneOffset() || 0);
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    var code = (h >>> 0).toString(16).toUpperCase();
    while (code.length < 6) code = '0' + code;
    return code.slice(0, 8);
  }
  function getDeviceCode() {
    if (deviceCode) return deviceCode;
    var stored = U.storage.get(DEVICE_KEY);
    if (typeof stored === 'string' && /^[0-9A-F]{6,8}$/.test(stored)) {
      deviceCode = stored;
    } else {
      deviceCode = fingerprintHash();
      U.storage.set(DEVICE_KEY, deviceCode);
    }
    return deviceCode;
  }
  function saveKey() { return 'bloom_tale_save_' + getDeviceCode(); }
  function saveKeyBak() { return saveKey() + '_bak'; }
  function validSave(s) {
    return !!(s && s.v === 1 && typeof s.unlocked === 'number' && s.unlocked >= 1 && s.unlocked <= 60);
  }

  function loadSave() {
    var cands = [U.storage.get(saveKey()), U.storage.get(saveKeyBak()), U.storage.get(LEGACY_KEY)];
    var best = null;
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i];
      if (validSave(c) && (!best || (c.savedAt || 0) > (best.savedAt || 0))) best = c;
    }
    if (best) {
      save = best;
      persist(); // 迁移归位：旧版键 / 备份键恢复的进度落到本设备双键上
    } else {
      save = { v: 1, unlocked: 1, stars: {}, sound: true, run: null };
      persist();
    }
    if (!save.tips) save.tips = {};
    if (!save.best) save.best = {};
    return save;
  }
  function persist() {
    save.savedAt = Date.now();
    U.storage.set(saveKey(), save);
    U.storage.set(saveKeyBak(), save); // 双键冗余：任一键损坏互为备份
  }

  /* 重新开始：唯一清档入口（标题屏「重新开始」确认后调用），其余任何情况都保留进度 */
  function resetProgress() {
    var keepSound = save ? save.sound : true;
    save = { v: 1, unlocked: 1, stars: {}, sound: keepSound, run: null, tips: {}, best: {} };
    persist();
    U.storage.set(LEGACY_KEY, null); // 旧版键一并作废，防止旧进度回潮
    return save;
  }

  /* ---------- 存档迁移（导出 / 导入） ---------- */
  // 格式：BT1.<base64(UTF-8 JSON)>——换设备 / 换网址时把进度带走
  function exportCode() {
    return 'BT1.' + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  }
  function importCode(code) {
    try {
      code = String(code || '').trim();
      if (code.indexOf('BT1.') !== 0) return false;
      var data = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
      if (!data || data.v !== 1 || typeof data.unlocked !== 'number' || data.unlocked < 1) return false;
      // 兜底字段（兼容早期导出的存档码）
      if (!data.stars) data.stars = {};
      if (!data.tips) data.tips = {};
      if (!data.best) data.best = {};
      if (typeof data.sound !== 'boolean') data.sound = true;
      if (!data.run || typeof data.run !== 'object') data.run = null;
      if (data.unlocked > 60) data.unlocked = 60;
      save = data;
      persist();
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    COLOR_INFO: COLOR_INFO,
    HEROES: HEROES,
    FAMILY: FAMILY,
    CHAPTERS: CHAPTERS,
    MONSTER_MOVES: MONSTER_MOVES,
    BLESSINGS: BLESSINGS,
    BLESS_MAP: BLESS_MAP,
    modsFromBlessings: modsFromBlessings,
    OBJECTIVES: OBJECTIVES,
    buildLevel: buildLevel,
    loadSave: loadSave,
    persist: persist,
    getDeviceCode: getDeviceCode,
    resetProgress: resetProgress,
    exportCode: exportCode,
    importCode: importCode,
    get save() { return save; }
  };
})();

export { CONFIG, DATA };
