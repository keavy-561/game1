/* ==========================================================
   SVG 素材工厂：棋子 / 怪物 / 英雄 / 图标
   ========================================================== */
var SVG = (function () {

  var C = {
    r: { main: '#F2766B', deep: '#D95A50', light: '#FBD3CD' },
    b: { main: '#57B2E3', deep: '#3E92C4', light: '#CDE9F7' },
    g: { main: '#6DC087', deep: '#4E9E69', light: '#D2EDDA' },
    y: { main: '#F5B93F', deep: '#D89B22', light: '#FCEAC3' },
    p: { main: '#A78FD9', deep: '#8670BD', light: '#E3DCF4' }
  };
  var KEYS = ['r', 'b', 'g', 'y', 'p'];
  var INK = '#5B4A3F';

  function svg(inner, vb, cls) {
    return '<svg viewBox="' + (vb || '0 0 100 100') + '"' + (cls ? ' class="' + cls + '"' : '') + ' xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }

  /* ---------- 棋子图案 ---------- */
  function glyph(type) {
    var k = KEYS[type] || 'r', c = C[k];
    switch (k) {
      case 'r': // 花瓣：五瓣花
        var petals = '';
        for (var i = 0; i < 5; i++) {
          petals += '<ellipse cx="50" cy="26" rx="13" ry="19" fill="' + c.main + '" transform="rotate(' + (i * 72) + ' 50 50)"/>' +
            '<ellipse cx="50" cy="30" rx="7" ry="11" fill="' + c.light + '" opacity=".55" transform="rotate(' + (i * 72) + ' 50 50)"/>';
        }
        return svg(petals + '<circle cx="50" cy="50" r="10" fill="' + c.deep + '"/><circle cx="50" cy="50" r="5" fill="#FFF3E6"/>');
      case 'b': // 水滴
        return svg('<path d="M50 8 C60 30 76 42 76 60 A26 26 0 1 1 24 60 C24 42 40 30 50 8 Z" fill="' + c.main + '"/>' +
          '<path d="M50 16 C56 30 68 42 68 58 A18 18 0 0 1 56 74 C60 60 52 50 46 42 Z" fill="' + c.light + '" opacity=".8"/>' +
          '<ellipse cx="40" cy="62" rx="6" ry="8" fill="#fff" opacity=".75" transform="rotate(-18 40 62)"/>');
      case 'g': // 叶片
        return svg('<g transform="rotate(40 50 50)"><path d="M50 6 C80 24 86 62 50 94 C14 62 20 24 50 6 Z" fill="' + c.main + '"/>' +
          '<path d="M50 10 C42 40 42 62 50 88 C58 62 58 40 50 10 Z" fill="' + c.deep + '" opacity=".45"/>' +
          '<path d="M50 14 L50 88" stroke="' + c.deep + '" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>' +
          '<path d="M50 34 L38 28 M50 34 L62 28 M50 52 L36 44 M50 52 L64 44 M50 68 L40 62 M50 68 L60 62" stroke="' + c.deep + '" stroke-width="2.4" stroke-linecap="round" opacity=".4"/></g>');
      case 'y': // 星星
        return svg('<path d="M50 8 L61 38 L93 38 L67 57 L76 88 L50 68 L24 88 L33 57 L7 38 L39 38 Z" fill="' + c.main + '" stroke="' + c.main + '" stroke-width="10" stroke-linejoin="round"/>' +
          '<path d="M50 8 L61 38 L93 38 L67 57 L76 88 L50 68 L24 88 L33 57 L7 38 L39 38 Z" fill="none" stroke="' + c.deep + '" stroke-width="2" stroke-linejoin="round" opacity=".5"/>' +
          '<circle cx="44" cy="46" r="5" fill="#FFF7E2" opacity=".9"/><circle cx="38" cy="55" r="3" fill="#FFF7E2" opacity=".7"/>');
      case 'p': // 月牙
        return svg('<path d="M58 6 A44 44 0 1 0 58 94 A35 35 0 1 1 58 6 Z" fill="' + c.main + '"/>' +
          '<path d="M58 14 A34 34 0 1 1 58 86 A42 42 0 0 0 46 12 Z" fill="' + c.light + '" opacity=".6"/>' +
          '<circle cx="30" cy="30" r="3.5" fill="' + c.light + '"/><circle cx="24" cy="48" r="2.5" fill="' + c.light + '"/>');
    }
  }

  function stone() {
    return svg('<path d="M22 34 C20 18 38 10 52 12 C72 8 84 22 82 38 C92 46 88 66 76 72 C72 88 50 92 38 84 C20 88 10 70 18 58 C10 48 14 38 22 34 Z" fill="#CFC7B8" stroke="#B4A996" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 30 L46 44 M62 36 L56 50 M34 58 L46 60 M60 66 L50 70" stroke="#B4A996" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>' +
      '<circle cx="38" cy="26" r="4" fill="#E8E2D4" opacity=".8"/>');
  }

  function prismGem() {
    return svg('<path d="M50 8 L82 34 L70 86 L30 86 L18 34 Z" fill="#FFF" stroke="#E3D9C4" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 8 L66 34 L50 86 L34 34 Z" fill="#FCEAC3"/>' +
      '<path d="M18 34 L34 34 L30 86 Z" fill="#CDE9F7" opacity=".8"/>' +
      '<path d="M82 34 L66 34 L70 86 Z" fill="#E3DCF4" opacity=".8"/>' +
      '<path d="M34 34 L66 34 L60 82 L40 82 Z" fill="#fff" opacity=".35"/>' +
      '<path d="M50 20 L56 28" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="72" cy="20" r="4" fill="#F5B93F"/><circle cx="24" cy="76" r="3" fill="#A78FD9"/>');
  }

  /* ---------- 通用小脸 ---------- */
  function face(x1, x2, y, eye, opts) {
    opts = opts || {};
    var s = '';
    var er = eye || 7;
    s += '<circle cx="' + x1 + '" cy="' + y + '" r="' + er + '" fill="#FFF"/>' +
      '<circle cx="' + x2 + '" cy="' + y + '" r="' + er + '" fill="#FFF"/>' +
      '<circle cx="' + (x1 + 1) + '" cy="' + (y + 1.5) + '" r="' + (er * .48) + '" fill="' + INK + '"/>' +
      '<circle cx="' + (x2 + 1) + '" cy="' + (y + 1.5) + '" r="' + (er * .48) + '" fill="' + INK + '"/>' +
      '<circle cx="' + (x1 - 1.5) + '" cy="' + (y - 2) + '" r="' + (er * .18) + '" fill="#FFF"/>' +
      '<circle cx="' + (x2 - 1.5) + '" cy="' + (y - 2) + '" r="' + (er * .18) + '" fill="#FFF"/>';
    if (opts.blush) {
      s += '<ellipse cx="' + (x1 - 7) + '" cy="' + (y + 8) + '" rx="5" ry="3" fill="' + (opts.blushC || '#F5A9A0') + '" opacity=".55"/>' +
        '<ellipse cx="' + (x2 + 7) + '" cy="' + (y + 8) + '" rx="5" ry="3" fill="' + (opts.blushC || '#F5A9A0') + '" opacity=".55"/>';
    }
    if (opts.mouth !== 'none') {
      var my = y + 9;
      s += '<path d="M' + ((x1 + x2) / 2 - 5) + ' ' + my + ' Q' + ((x1 + x2) / 2) + ' ' + (my + (opts.frown ? -3 : 5)) + ' ' + ((x1 + x2) / 2 + 5) + ' ' + my + '" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    }
    return s;
  }

  /* ---------- 怪物家族 ---------- */
  var FAMILIES = {
    fluff: function (o) { // 绒球（草原）
      var c = o.tint || '#F8CFC4';
      return '<g class="m-body">' +
        '<ellipse cx="50" cy="58" rx="33" ry="29" fill="' + c + '"/>' +
        '<ellipse cx="50" cy="36" rx="10" ry="16" fill="' + c + '" transform="rotate(-24 50 20)"/>' +
        '<ellipse cx="50" cy="36" rx="10" ry="16" fill="' + c + '" transform="rotate(24 50 20)"/>' +
        '<ellipse cx="24" cy="58" rx="9" ry="8" fill="' + c + '" opacity=".8"/>' +
        '<ellipse cx="76" cy="58" rx="9" ry="8" fill="' + c + '" opacity=".8"/>' +
        face(40, 60, 54, 7, { blush: true }) +
        '<path d="M44 84 Q50 80 56 84" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".4"/>' +
        '</g>';
    },
    mushroom: function (o) { // 蘑菇怪（森林）
      var cap = o.tint || '#EE9C8A';
      return '<g class="m-body">' +
        '<rect x="34" y="52" width="32" height="36" rx="14" fill="#FFF3E0"/>' +
        '<path d="M12 54 C12 26 34 12 50 12 C66 12 88 26 88 54 Q50 62 12 54 Z" fill="' + cap + '"/>' +
        '<circle cx="32" cy="36" r="7" fill="#FFF3E0"/><circle cx="56" cy="28" r="5" fill="#FFF3E0"/><circle cx="70" cy="42" r="6" fill="#FFF3E0"/><circle cx="24" cy="47" r="4" fill="#FFF3E0"/>' +
        face(41, 59, 70, 6, { blush: true, blushC: '#F2B8A0' }) +
        '</g>';
    },
    jelly: function (o) { // 泡泡水母（湖畔）
      var c = o.tint || '#8CC8EE';
      return '<g class="m-body">' +
        '<path d="M14 52 C14 24 32 10 50 10 C68 10 86 24 86 52 Q68 60 50 60 Q32 60 14 52 Z" fill="' + c + '" opacity=".92"/>' +
        '<path d="M22 52 C22 30 36 18 50 18 C64 18 78 30 78 52 Q64 56 50 56 Q36 56 22 52 Z" fill="#D6ECF9" opacity=".55"/>' +
        '<path d="M24 58 Q22 74 28 84 M40 60 Q40 78 36 88 M58 60 Q58 78 62 88 M74 58 Q76 74 70 84" stroke="' + c + '" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>' +
        '<path d="M34 40 Q38 36 42 40 M58 40 Q62 36 66 40" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        face(41, 59, 52, 6.5, { mouth: 'none', blush: true, blushC: '#EFA8A0' }) +
        '<path d="M45 62 Q50 66 55 62" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
        '</g>';
    },
    golem: function (o) { // 石像鬼（洞窟）
      var c = o.tint || '#B7ACD6';
      return '<g class="m-body">' +
        '<path d="M20 46 L20 78 Q20 88 30 88 L70 88 Q80 88 80 78 L80 46 L68 34 L32 34 Z" fill="' + c + '" stroke="#9C8FC4" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M32 34 L26 18 L38 26 L42 12 L50 24 L58 12 L62 26 L74 18 L68 34 Z" fill="#9C8FC4"/>' +
        '<path d="M30 58 L38 62 M70 58 L62 62 M42 78 L58 78" stroke="#9C8FC4" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' +
        face(40, 60, 56, 6.5, { frown: o.frown }) +
        '</g>';
    },
    cloudbird: function (o) { // 云雏鸟（崖顶）
      var c = o.tint || '#EDEFF2';
      return '<g class="m-body">' +
        '<ellipse cx="50" cy="56" rx="30" ry="26" fill="' + c + '"/>' +
        '<circle cx="30" cy="50" r="14" fill="' + c + '"/><circle cx="70" cy="50" r="14" fill="' + c + '"/>' +
        '<ellipse cx="50" cy="34" rx="22" ry="17" fill="' + c + '"/>' +
        '<path d="M50 46 L58 52 L50 58 Z" fill="#F5B93F"/>' +
        '<path d="M18 60 Q6 58 8 48 Q16 50 20 54 Z" fill="#D8DDE3"/>' +
        '<path d="M82 60 Q94 58 92 48 Q84 50 80 54 Z" fill="#D8DDE3"/>' +
        face(40, 60, 36, 6, { blush: true, blushC: '#F2B8A0' }) +
        '<path d="M46 62 Q50 70 54 62" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '</g>';
    },
    roseking: function (o) { // 荆棘王（终焉花园 Boss）
      return '<g class="m-body">' +
        '<path d="M50 84 C30 84 24 66 30 52 C22 50 22 36 32 32 C28 18 44 8 50 14 C56 8 72 18 68 32 C78 36 78 50 70 52 C76 66 70 84 50 84 Z" fill="#C9556E" stroke="#A43D5A" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M50 78 C36 78 34 62 40 54 C32 50 36 38 44 40 C42 26 54 22 50 30 C46 22 58 26 56 40 C64 38 68 50 60 54 C66 62 64 78 50 78 Z" fill="#E77C93" opacity=".8"/>' +
        '<circle cx="50" cy="54" r="10" fill="#8E2F4C"/>' +
        '<path d="M50 46 A10 10 0 0 1 50 66 A7 7 0 0 0 50 46 Z" fill="#F6D7C6" opacity=".65"/>' +
        '<path d="M22 34 Q10 28 14 16 Q24 20 26 28 Z" fill="#5B8F5E"/><path d="M78 34 Q90 28 86 16 Q76 20 74 28 Z" fill="#5B8F5E"/>' +
        face(42, 58, 52, 5.5, { frown: true }) +
        '<path d="M44 64 Q50 60 56 64" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '</g>';
    },
    sprout: function (o) { // 小萌芽（召唤物）
      var c = o.tint || '#A5D6AE';
      return '<g class="m-body">' +
        '<ellipse cx="50" cy="62" rx="22" ry="19" fill="' + c + '"/>' +
        '<path d="M50 44 C50 30 40 28 40 20 C48 22 50 30 50 36 C50 30 52 22 60 20 C60 28 50 30 50 44 Z" fill="#5B8F5E"/>' +
        face(43, 57, 60, 5.5, { blush: true, blushC: '#F2B8A0' }) +
        '</g>';
    }
  };

  function monster(family, opts) {
    opts = opts || {};
    var f = FAMILIES[family] || FAMILIES.fluff;
    return svg(f(opts));
  }

  /* ---------- 英雄头像 ---------- */
  var HERO_ART = {
    hong: function () { // 绯樱
      return '<circle cx="50" cy="50" r="46" fill="#FDECE7"/>' +
        '<path d="M50 96 C24 96 16 78 20 62 C10 60 12 40 24 38 C20 20 38 8 50 14 C62 8 80 20 76 38 C88 40 90 60 80 62 C84 78 76 96 50 96 Z" fill="#F2766B"/>' +
        '<circle cx="50" cy="52" r="24" fill="#FFE8DC"/>' +
        '<circle cx="72" cy="30" r="7" fill="#F5B93F"/><circle cx="72" cy="30" r="3" fill="#FFF7E2"/>' +
        face(43, 57, 52, 5, { blush: true }) +
        '<path d="M64 62 Q70 56 74 62" stroke="#D95A50" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    lan: function () { // 澜
      return '<circle cx="50" cy="50" r="46" fill="#E4F1FA"/>' +
        '<path d="M50 8 C70 16 78 34 74 52 C84 62 76 84 62 82 C64 92 44 94 42 82 C28 86 18 64 28 52 C20 34 30 14 50 8 Z" fill="#57B2E3"/>' +
        '<circle cx="50" cy="52" r="24" fill="#FFE8DC"/>' +
        '<path d="M30 44 Q40 30 56 32 Q68 34 72 46 Q60 40 50 42 Q38 44 30 44 Z" fill="#8CC8EE"/>' +
        face(43, 57, 52, 5, { blush: true }) +
        '<path d="M42 64 Q50 70 58 64" stroke="#3E92C4" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    ya: function () { // 芽
      return '<circle cx="50" cy="50" r="46" fill="#E7F5E9"/>' +
        '<ellipse cx="50" cy="56" rx="30" ry="28" fill="#6DC087"/>' +
        '<path d="M50 26 C50 14 40 12 40 4 C48 6 50 14 50 20 C50 14 52 6 60 4 C60 12 50 14 50 26 Z" fill="#4E9E69"/>' +
        '<circle cx="50" cy="54" r="22" fill="#FFE8DC"/>' +
        face(43, 57, 54, 5, { blush: true }) +
        '<path d="M40 64 Q50 72 60 64" stroke="#4E9E69" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    liang: function () { // 亮
      return '<circle cx="50" cy="50" r="46" fill="#FDF5DE"/>' +
        '<path d="M50 10 L58 34 L84 34 L63 49 L71 76 L50 60 L29 76 L37 49 L16 34 L42 34 Z" fill="#F5B93F" stroke="#F5B93F" stroke-width="8" stroke-linejoin="round"/>' +
        '<circle cx="50" cy="54" r="22" fill="#FFE8DC"/>' +
        face(43, 57, 54, 5, { blush: true }) +
        '<path d="M42 65 Q50 71 58 65" stroke="#D89B22" stroke-width="2" fill="none" stroke-linecap="round"/>';
    },
    ying: function () { // 影
      return '<circle cx="50" cy="50" r="46" fill="#EFEAF8"/>' +
        '<path d="M22 92 C10 70 14 34 34 20 C28 36 34 46 44 44 C40 56 46 70 58 66 C54 80 66 90 78 78 C82 86 74 94 62 94 Z" fill="#A78FD9"/>' +
        '<path d="M78 14 A12 12 0 1 0 78 38 A9.5 9.5 0 1 1 78 14 Z" fill="#8670BD"/>' +
        '<circle cx="50" cy="54" r="22" fill="#FFE8DC"/>' +
        face(43, 57, 54, 5, { blush: true, blushC: '#E3B8D8' }) +
        '<path d="M44 65 Q50 69 56 65" stroke="#8670BD" stroke-width="2" fill="none" stroke-linecap="round"/>';
    }
  };

  function hero(id) {
    return svg(HERO_ART[id] || HERO_ART.hong);
  }

  /* ---------- UI 图标（线性风格，viewBox 24） ---------- */
  function icon(name, color) {
    var s = 'fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
    var inner = '';
    switch (name) {
      case 'back': inner = '<path ' + s + ' d="M14 5 L7 12 L14 19"/><path ' + s + ' d="M7 12 H20"/>'; break;
      case 'sound': inner = '<path ' + s + ' d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="' + (color || 'currentColor') + '"/><path ' + s + ' d="M16 9 Q18 12 16 15"/><path ' + s + ' d="M18.5 7 Q21.5 12 18.5 17"/>'; break;
      case 'soundOff': inner = '<path ' + s + ' d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="' + (color || 'currentColor') + '"/><path ' + s + ' d="M16 9 L21 15 M21 9 L16 15"/>'; break;
      case 'list': inner = '<path ' + s + ' d="M5 7 H12 M5 12 H12 M5 17 H9"/><path ' + s + ' d="M16 5 L17.5 8.5 L21 10 L17.5 11.5 L16 15 L14.5 11.5 L11 10 L14.5 8.5 Z" fill="' + (color || 'currentColor') + '" stroke="none"/>'; break;
      case 'sword': inner = '<path ' + s + ' d="M5 19 L15 9 M14 4 L20 10 L17 13 L11 7 Z" fill="' + (color || 'currentColor') + '" fill-opacity=".2"/><path ' + s + ' d="M4 16 L8 20"/>'; break;
      case 'swordHeavy': inner = '<path ' + s + ' d="M3 19 L12 10 M11 5 L16 10 M17 19 L12 14 M18 8 L21 5 M19 3 L16 6"/>'; break;
      case 'shield': inner = '<path ' + s + ' d="M12 3 L19 6 V12 C19 16.5 16 19.5 12 21 C8 19.5 5 16.5 5 12 V6 Z"/>'; break;
      case 'clock': inner = '<circle ' + s + ' cx="12" cy="12" r="8.5"/><path ' + s + ' d="M12 7.5 V12 L15 14"/>'; break;
      case 'curse': inner = '<path ' + s + ' d="M7 4 H17 L19 9 L12 21 L5 9 Z"/><path ' + s + ' d="M9.5 9 H14.5 M12 9 L12 15"/>'; break;
      case 'summon': inner = '<path ' + s + ' d="M12 4 C17 7 19 11 19 14 A7 7 0 1 1 5 14 C5 11 7 7 12 4 Z"/><path ' + s + ' d="M12 21 V14.5 M9.5 17.5 L12 15 L14.5 17.5"/>'; break;
      case 'up': inner = '<path ' + s + ' d="M12 19 V6 M7 11 L12 6 L17 11"/>'; break;
      case 'heart': inner = '<path ' + s + ' d="M12 20 C6 16 3.5 12.5 3.5 9.5 C3.5 7 5.5 5 8 5 C9.7 5 11 6 12 7.5 C13 6 14.3 5 16 5 C18.5 5 20.5 7 20.5 9.5 C20.5 12.5 18 16 12 20 Z"/>'; break;
      case 'star': inner = '<path ' + s + ' d="M12 3.5 L14.4 8.8 L20.2 9.4 L15.8 13.2 L17.1 19 L12 16 L6.9 19 L8.2 13.2 L3.8 9.4 L9.6 8.8 Z" fill="' + (color || 'currentColor') + '" fill-opacity=".25"/>'; break;
      case 'starFill': inner = '<path d="M12 3.5 L14.4 8.8 L20.2 9.4 L15.8 13.2 L17.1 19 L12 16 L6.9 19 L8.2 13.2 L3.8 9.4 L9.6 8.8 Z" fill="' + (color || '#F5B93F') + '" stroke="' + (color || '#F5B93F') + '" stroke-width="1.5" stroke-linejoin="round"/>'; break;
      case 'starEmpty': inner = '<path d="M12 3.5 L14.4 8.8 L20.2 9.4 L15.8 13.2 L17.1 19 L12 16 L6.9 19 L8.2 13.2 L3.8 9.4 L9.6 8.8 Z" fill="#E9DCC4" stroke="#DCCEB0" stroke-width="1.5" stroke-linejoin="round"/>'; break;
      case 'swap': inner = '<path ' + s + ' d="M8 5 L4 9 L8 13"/><path ' + s + ' d="M4 9 H15"/><path ' + s + ' d="M16 11 L20 15 L16 19"/><path ' + s + ' d="M20 15 H9"/>'; break;
      case 'match': inner = '<circle ' + s + ' cx="6" cy="12" r="2.6" fill="' + (color || 'currentColor') + '"/><circle ' + s + ' cx="12" cy="12" r="2.6" fill="' + (color || 'currentColor') + '"/><circle ' + s + ' cx="18" cy="12" r="2.6" fill="' + (color || 'currentColor') + '"/><path ' + s + ' d="M9 5.5 L11 4 M15 5.5 L13 4"/>'; break;
      case 'attack': inner = '<path ' + s + ' d="M12 19 V8"/><path ' + s + ' d="M8.5 11.5 L12 8 L15.5 11.5"/><path ' + s + ' d="M6 5 H18"/>'; break;
      case 'bomb': inner = '<circle ' + s + ' cx="11" cy="14" r="6.5"/><path ' + s + ' d="M14.5 8.5 L17 6"/><path ' + s + ' d="M17.5 4.5 L16.5 6.5 L18.5 7.5"/><circle cx="18.5" cy="9.5" r="1" fill="' + (color || 'currentColor') + '"/>'; break;
      case 'prism': inner = '<path ' + s + ' d="M12 3 L19 9 L16.5 20 H7.5 L5 9 Z"/><path ' + s + ' d="M12 3 L14 9 L12 20 L10 9 Z"/>'; break;
      case 'sparkle': inner = '<path ' + s + ' d="M12 4 L13.8 10.2 L20 12 L13.8 13.8 L12 20 L10.2 13.8 L4 12 L10.2 10.2 Z" fill="' + (color || 'currentColor') + '" fill-opacity=".2"/><path ' + s + ' d="M18.5 4.5 L19 5.5 M4.5 18.5 L5 19.5"/>'; break;
      case 'flame': inner = '<path ' + s + ' d="M12 3.5 C15 7 18 9 18 13 A6 6 0 1 1 6 13 C6 10 9 7 12 3.5 Z"/><path ' + s + ' d="M12 21 C10.5 21 9.5 20 9.5 18.5 C9.5 17 11 16 12 14.5 C13 16 14.5 17 14.5 18.5 C14.5 20 13.5 21 12 21 Z"/>'; break;
      case 'gauge': inner = '<path ' + s + ' d="M5 18 A8.5 8.5 0 1 1 19 18"/><path ' + s + ' d="M12 13 L15.5 8.5"/><circle cx="12" cy="18" r="1.4" fill="' + (color || 'currentColor') + '"/>'; break;
      case 'moonIc': inner = '<path ' + s + ' d="M15 3.5 A9 9 0 1 0 15 20.5 A7 7 0 1 1 15 3.5 Z"/>'; break;
      case 'dropIc': inner = '<path ' + s + ' d="M12 3.5 C14.5 8 18 10.5 18 14.5 A6 6 0 1 1 6 14.5 C6 10.5 9.5 8 12 3.5 Z"/>'; break;
      case 'leafIc': inner = '<path ' + s + ' d="M5 19 C5 9 12 4 20 4 C20 14 13 19 5 19 Z"/><path ' + s + ' d="M5 19 C9 13 14 9 18 6"/>'; break;
      case 'petalIc': inner = '<circle ' + s + ' cx="12" cy="12" r="3"/><ellipse ' + s + ' cx="12" cy="6.5" rx="2.8" ry="4"/><ellipse ' + s + ' cx="17" cy="14.5" rx="2.8" ry="4" transform="rotate(72 17 14.5)"/><ellipse ' + s + ' cx="9" cy="16.5" rx="2.8" ry="4" transform="rotate(-72 9 16.5)"/>'; break;
      case 'check': inner = '<path ' + s + ' d="M5 12.5 L10 17.5 L19 7"/>'; break;
      case 'close': inner = '<path ' + s + ' d="M6 6 L18 18 M18 6 L6 18"/>'; break;
      case 'lock': inner = '<rect ' + s + ' x="6" y="10.5" width="12" height="9" rx="2.5"/><path ' + s + ' d="M8.5 10.5 V8 A3.5 3.5 0 0 1 15.5 8 V10.5"/>'; break;
      case 'flag': inner = '<path ' + s + ' d="M6 21 V4"/><path ' + s + ' d="M6 5 H17.5 L14.5 9 L17.5 13 H6" fill="' + (color || 'currentColor') + '" fill-opacity=".2"/>'; break;
      case 'crown': inner = '<path ' + s + ' d="M4 17 L3 7 L8 11 L12 4.5 L16 11 L21 7 L20 17 Z" fill="' + (color || 'currentColor') + '" fill-opacity=".2"/><path ' + s + ' d="M4.5 20 H19.5"/>'; break;
      case 'freeze': inner = '<path ' + s + ' d="M12 3 V21 M5 7.5 L19 16.5 M19 7.5 L5 16.5"/><path ' + s + ' d="M9.5 5 L12 7 L14.5 5 M9.5 19 L12 17 L14.5 19"/>'; break;
      case 'healIc': inner = '<path ' + s + ' d="M12 6 V18 M6 12 H18" stroke-width="3"/><circle ' + s + ' cx="12" cy="12" r="9.5"/>'; break;
      case 'restart': inner = '<path ' + s + ' d="M6 12 A6.5 6.5 0 1 1 8.5 17"/><path ' + s + ' d="M6 8.5 V12.5 H10"/>'; break;
      case 'pause': inner = '<rect x="6.5" y="4.5" width="4" height="15" rx="1.6" fill="' + (color || 'currentColor') + '"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.6" fill="' + (color || 'currentColor') + '"/>'; break;
      default: inner = '<circle ' + s + ' cx="12" cy="12" r="8"/>';
    }
    return svg(inner, '0 0 24 24');
  }

  /* ---------- 引导手 ---------- */
  function hand() {
    return svg('<circle cx="38" cy="62" r="20" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M30 62 C30 48 34 42 38 42 C42 42 44 46 44 52 L44 30 C44 24 52 24 52 30 L52 50 C52 50 54 46 58 46 C62 46 63 50 63 54 L63 50 C63 44 71 44 71 50 L71 64 C71 76 62 84 50 84 C40 84 30 76 30 62 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="62" r="2" fill="' + INK + '" opacity=".3"/><circle cx="34" cy="68" r="2" fill="' + INK + '" opacity=".3"/>');
  }

  /* ---------- 标题 Logo：环抱五色花 ---------- */
  function logo() {
    var ring = '';
    var pts = [[50, 12], [81, 30], [81, 70], [50, 88], [19, 70], [19, 30]];
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * Math.PI / 180;
      var x = 50 + Math.cos(a) * 34, y = 50 + Math.sin(a) * 34;
      ring += '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(.34) translate(-50,-50)">' + glyph(i).replace('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">', '').replace('</svg>', '') + '</g>';
    }
    return svg(
      '<ellipse cx="50" cy="54" rx="30" ry="28" fill="#F2766B"/>' +
      '<ellipse cx="50" cy="54" rx="20" ry="19" fill="#FBD3CD" opacity=".7"/>' +
      '<circle cx="50" cy="54" r="10" fill="#D95A50"/><circle cx="50" cy="54" r="5" fill="#FFF3E6"/>' +
      '<circle cx="44" cy="50" r="3.5" fill="#FFF"/><circle cx="56" cy="50" r="3.5" fill="#FFF"/><circle cx="44" cy="50" r="1.8" fill="' + INK + '"/><circle cx="56" cy="50" r="1.8" fill="' + INK + '"/>' +
      '<path d="M46 60 Q50 64 54 60" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      ring
    );
  }

  return {
    C: C, KEYS: KEYS,
    glyph: glyph, stone: stone, prismGem: prismGem,
    monster: monster, hero: hero, icon: icon, hand: hand, logo: logo,
    face: face
  };
})();

export { SVG };
