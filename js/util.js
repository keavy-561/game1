/* ============ 工具函数 ============ */
var U = {
  sleep: function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); },

  clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); },

  lerp: function (a, b, t) { return a + (b - a) * t; },

  // 可复现的伪随机数（mulberry32）
  rng: function (seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  randInt: function (rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); },

  choice: function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; },

  shuffle: function (rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  // DOM 快捷方式
  el: function (tag, className, parent) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (parent) parent.appendChild(e);
    return e;
  },

  div: function (className, parent) { return U.el('div', className, parent); },

  clearEl: function (e) { while (e.firstChild) e.removeChild(e.firstChild); },

  fmt: function (n) {
    n = Math.round(n);
    if (n >= 10000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  },

  // 安全的本地存档（file:// 下失败则退化为内存）
  storage: {
    mem: {},
    get: function (key) {
      try { var v = localStorage.getItem(key); if (v != null) return JSON.parse(v); } catch (e) { }
      return this.mem[key] !== undefined ? JSON.parse(this.mem[key]) : null;
    },
    set: function (key, val) {
      var s = JSON.stringify(val);
      try { localStorage.setItem(key, s); } catch (e) { this.mem[key] = s; }
    }
  },

  // 事件委托：给元素绑定一次性 pointer 点击
  onTap: function (el, fn) {
    el.addEventListener('pointerup', function (ev) {
      if (el.__disabled) return;
      fn(ev);
    });
    el.addEventListener('click', function (ev) { ev.preventDefault(); });
  }
};

// 简单的屏幕震动 / 弹跳曲线（供 CSS 变量动画用不到，JS 备用）
U.ease = {
  outBack: function (t) { var c = 1.70158; t -= 1; return t * t * ((c + 1) * t + c) + 1; },
  outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
  inCubic: function (t) { return t * t * t; }
};

export { U };
