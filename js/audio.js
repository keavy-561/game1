/* ============ 轻量合成音效（WebAudio，无外部资源） ============ */

/* 背景音乐：8 小节五声音阶旋律（-1 为休止），音高索引对应 BGM_SCALE */
var BGM_MELODY = [
  2, -1, 3, -1, 4, -1, 3, -1,
  2, -1, 1, -1, 0, -1, -1, -1,
  3, -1, 4, -1, 5, -1, 4, -1,
  3, -1, 2, -1, 1, -1, -1, -1,
  5, -1, 4, -1, 3, -1, 4, -1,
  5, -1, 3, -1, 2, -1, -1, -1,
  1, -1, 2, -1, 3, 2, 1, -1,
  0, -1, -1, -1, 0, -1, -1, -1
];
var BGM_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.26];
var BGM_ROOTS = [130.81, 110.00, 174.61, 196.00, 130.81, 110.00, 174.61, 98.00]; // C Am F G…
var BGM_TRANS = [0, 2, 4, -3, 5, -5]; // 每章转调（半音）

var AudioFX = {
  ctx: null,
  master: null,
  enabled: true,

  bgm: { on: false, theme: 0, timer: null, step: 0, nextTime: 0, gain: null },

  init: function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },

  // 单音：类型、频率、时长、音量包络
  tone: function (freq, dur, type, vol, when, slide) {
    if (!this.ctx || !this.enabled) return;
    var t0 = this.ctx.currentTime + (when || 0);
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },

  noise: function (dur, vol, when) {
    if (!this.ctx || !this.enabled) return;
    var t0 = this.ctx.currentTime + (when || 0);
    var len = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var g = this.ctx.createGain();
    g.gain.value = vol || 0.15;
    var f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1400;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  /* ============ 背景音乐（BGM） ============ */
  // BGM 专用音符：绝对时间调度 + 可设起音（垫音用慢起音）
  bgmNote: function (freq, dur, type, vol, when, attack) {
    if (!this.ctx || !this.bgm.gain || !this.enabled) return;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + (attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0006, when + dur);
    o.connect(g); g.connect(this.bgm.gain);
    o.start(when); o.stop(when + dur + 0.1);
  },

  bgmStart: function (theme) {
    this.init();
    if (!this.ctx) return; // 音频尚未解锁（等待首次手势）
    if (!this.bgm.gain) {
      this.bgm.gain = this.ctx.createGain();
      this.bgm.gain.gain.value = 0;
      this.bgm.gain.connect(this.ctx.destination);
    }
    if (theme !== undefined && theme !== null) this.bgm.theme = theme;
    if (this.bgm.on) return;
    this.bgm.on = true;
    this.bgm.step = 0;
    this.bgm.nextTime = this.ctx.currentTime + 0.15;
    var now = this.ctx.currentTime;
    try {
      this.bgm.gain.gain.cancelScheduledValues(now);
      this.bgm.gain.gain.setValueAtTime(0.0001, now);
      this.bgm.gain.gain.exponentialRampToValueAtTime(0.5, now + 2); // 淡入
    } catch (e) { }
    clearInterval(this.bgm.timer);
    var self = this;
    this.bgm.timer = setInterval(function () { self.bgmTick(); }, 180);
  },

  // 切换章节主题（战斗开始时调用）
  bgmSetTheme: function (theme) {
    this.bgm.theme = theme || 0;
    if (this.ctx && this.enabled && !this.bgm.on) this.bgmStart();
  },

  bgmStop: function () {
    if (!this.bgm.on) return;
    this.bgm.on = false;
    clearInterval(this.bgm.timer);
    if (this.bgm.gain && this.ctx) {
      var now = this.ctx.currentTime;
      try {
        this.bgm.gain.gain.cancelScheduledValues(now);
        this.bgm.gain.gain.setValueAtTime(Math.max(0.0001, this.bgm.gain.gain.value), now);
        this.bgm.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1); // 淡出
      } catch (e) { }
    }
  },

  // 前瞻式调度：静音时保持时钟，恢复后无缝续播
  bgmTick: function () {
    if (!this.ctx || !this.bgm.on) return;
    if (!this.enabled) { this.bgm.nextTime = this.ctx.currentTime + 0.2; return; }
    var STEP = 0.36; // 八分音符（约 83 BPM）
    var ahead = this.ctx.currentTime + 0.6;
    var guard = 0;
    while (this.bgm.nextTime < ahead && guard++ < 12) {
      this.bgmPlayStep(this.bgm.step, this.bgm.nextTime);
      this.bgm.step = (this.bgm.step + 1) % 64;
      this.bgm.nextTime += STEP;
    }
  },

  bgmPlayStep: function (step, t) {
    var chapter = (this.bgm.theme || 0) % 6;
    var mul = Math.pow(2, BGM_TRANS[chapter] / 12);
    var lead = ['triangle', 'sine', 'sine', 'triangle', 'sine', 'triangle'][chapter];
    var s = step % 64;
    var bar = Math.floor(s / 8);
    var inBar = s % 8;

    // 低音：每小节第 1、5 拍
    if (inBar === 0 || inBar === 4) {
      this.bgmNote(BGM_ROOTS[bar] * mul, 1.15, 'sine', 0.1, t);
    }
    // 和声垫：每两小节一次（慢起音）
    if (s % 16 === 0) {
      var root = BGM_ROOTS[bar] * 2 * mul;
      this.bgmNote(root, 3.4, 'triangle', 0.035, t, 0.5);
      this.bgmNote(root * 1.5, 3.4, 'triangle', 0.028, t, 0.5);
    }
    // 主旋律：八音盒质感（高八度）
    var mel = BGM_MELODY[s];
    if (mel >= 0) {
      this.bgmNote(BGM_SCALE[mel] * 2 * mul, 0.5, lead, 0.08, t);
    }
  },

  play: function (name, opt) {
    if (!this.ctx) return;
    var T = this.tone.bind(this);
    switch (name) {
      case 'swap': T(520, 0.09, 'sine', 0.12, 0, 1.25); break;
      case 'swapFail': T(220, 0.12, 'sine', 0.1, 0, 0.7); break;
      case 'select': T(660, 0.06, 'sine', 0.09); break;
      case 'pop': {
        // 连消波次越高音调越亮
        var w = opt || 1;
        var f = 540 + (w - 1) * 55 + Math.random() * 50;
        T(f, 0.13, 'triangle', 0.2, 0, 1.6);
        T(f * 2, 0.08, 'sine', 0.07, 0.02, 1.5);
        break;
      }
      case 'pop2': {
        var w2 = opt || 2;
        var f2 = 600 + (w2 - 1) * 70 + Math.random() * 60;
        T(f2, 0.12, 'triangle', 0.18, 0, 1.55);
        T(f2 * 1.5, 0.11, 'triangle', 0.13, 0.05, 1.45);
        T(f2 * 2, 0.09, 'sine', 0.06, 0.08, 1.4);
        break;
      }
      case 'hit': T(180, 0.14, 'square', 0.12, 0, 0.55); this.noise(0.08, 0.08); break;
      case 'weak': T(880, 0.1, 'triangle', 0.22); T(1320, 0.12, 'triangle', 0.18, 0.05); break;
      case 'boom': this.noise(0.35, 0.3); T(90, 0.4, 'sine', 0.3, 0, 0.4); T(140, 0.25, 'square', 0.1, 0.02, 0.4); break;
      case 'megaBoom': this.noise(0.55, 0.4); T(60, 0.6, 'sine', 0.38, 0, 0.35); T(110, 0.4, 'square', 0.14, 0.02, 0.35); T(220, 0.3, 'triangle', 0.12, 0.06, 0.3); break;
      case 'prismCast': [523, 659, 784, 1047, 1319].forEach(function (f, i) { T(f, 0.14, 'triangle', 0.16, i * 0.06, 1.12); }); this.noise(0.25, 0.05, 0.2); break;
      case 'energy': T(980, 0.08, 'sine', 0.1, 0, 1.4); T(1470, 0.09, 'sine', 0.08, 0.05, 1.3); break;
      case 'skill': T(523, 0.1, 'triangle', 0.2); T(659, 0.1, 'triangle', 0.2, 0.08); T(784, 0.16, 'triangle', 0.22, 0.16); break;
      case 'heal': T(523, 0.12, 'sine', 0.16); T(784, 0.18, 'sine', 0.16, 0.1); break;
      case 'shield': T(392, 0.2, 'sine', 0.18, 0, 1.3); T(587, 0.2, 'sine', 0.14, 0.08, 1.2); break;
      case 'freeze': T(1568, 0.14, 'sine', 0.12, 0, 0.6); this.noise(0.2, 0.06); break;
      case 'slash': T(1200, 0.08, 'sawtooth', 0.1, 0, 0.4); this.noise(0.1, 0.12); break;
      case 'monsterAct': T(160, 0.18, 'square', 0.14, 0, 0.6); break;
      case 'monsterDie': T(400, 0.3, 'triangle', 0.2, 0, 0.3); this.noise(0.2, 0.12); break;
      case 'win': [523, 659, 784, 1047].forEach(function (f, i) { T(f, 0.18, 'triangle', 0.22, i * 0.12); }); break;
      case 'lose': [392, 330, 262].forEach(function (f, i) { T(f, 0.25, 'sine', 0.18, i * 0.18); }); break;
      case 'star': T(1047, 0.12, 'triangle', 0.2); T(1568, 0.15, 'triangle', 0.16, 0.08); break;
      case 'bless': T(660, 0.12, 'sine', 0.16); T(990, 0.14, 'sine', 0.16, 0.09); T(1320, 0.2, 'sine', 0.12, 0.18); break;
    }
  }
};

export { AudioFX };
