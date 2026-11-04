/* ==========================================================
   启动入口
   ========================================================== */
(function () {
  function boot() {
    DATA.loadSave();
    AudioFX.enabled = DATA.save.sound !== false;
    UI.init();
    UI.showTitle();

    // 首次交互时初始化音频并启动背景音乐（浏览器自动播放策略）
    var initAudio = function () {
      AudioFX.init();
      AudioFX.bgmStart(0);
      document.removeEventListener('pointerdown', initAudio);
    };
    document.addEventListener('pointerdown', initAudio);

    // 从后台回到前台时恢复音频上下文（手机端常见挂起）
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) AudioFX.init();
    });

    // 阻止双击缩放 / 长按菜单
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) {
      if (e.target.closest('#board')) e.preventDefault();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
