// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      5.0
// @description  🖥️ CPU / GPU / Memory / FPS monitor with graph, dark mode, drag move, and persistent settings.
// @author       O-TYAN64
// @homepageURL  https://github.com/O-TYAN64/web-task-manager
// @updateURL    https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js
// @downloadURL  https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js
// @license      MIT
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const domain = location.hostname;
  const saved = JSON.parse(localStorage.getItem("taskmgr_settings_" + domain) || "{}");
  let autoTheme = saved.autoTheme ?? true;
  let manualTheme = saved.manualTheme ?? "dark";

  const root = document.documentElement;
  const container = document.createElement("div");
  container.id = "taskmgr";
  container.innerHTML = `
    <style>
      #taskmgr {
        position: fixed;
        bottom: 0;
        width: 100%;
        background: var(--bg);
        color: var(--text);
        text-align: center;
        font-family: 'Segoe UI', sans-serif;
        transition: background 0.3s, color 0.3s;
        z-index: 999999;
        user-select: none;
      }
      :root {
        --bg: rgba(0, 0, 0, 0.4);
        --text: #fff;
      }
      body.light {
        --bg: rgba(255,255,255,0.5);
        --text: #000;
      }
      #tmgr-controls {
        position: absolute;
        top: 10px;
        right: 10px;
      }
      #tmgr-controls button {
        background: transparent;
        border: 1px solid var(--text);
        color: var(--text);
        margin-left: 5px;
        cursor: pointer;
        border-radius: 6px;
        padding: 2px 8px;
      }
      #tmgr-controls button:hover {
        background: rgba(255,255,255,0.1);
      }
    </style>
    <div id="tmgr-controls">
      <button id="toggleTheme">🌓</button>
    </div>
    <div style="padding:8px;">Task Manager Active</div>
  `;
  document.body.appendChild(container);

  // 🎨 テーマ適用
  function applyTheme(theme) {
    if (theme === "light") document.body.classList.add("light");
    else document.body.classList.remove("light");
  }

  // 🌈 背景明度を自動検出
  function detectPageBrightness() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const rgb = bg.match(/\d+/g)?.map(Number);
    if (!rgb) return 0; // fallback
    const brightness = (rgb[0]*0.299 + rgb[1]*0.587 + rgb[2]*0.114);
    return brightness;
  }

  function autoAdjustTheme() {
    const brightness = detectPageBrightness();
    if (brightness > 160) {
      applyTheme("light");
      manualTheme = "light";
    } else {
      applyTheme("dark");
      manualTheme = "dark";
    }
  }

  // ⚙️ 起動時の処理
  if (autoTheme) {
    autoAdjustTheme();
  } else {
    applyTheme(manualTheme);
  }

  // 👆 ユーザー手動切替
  document.getElementById("toggleTheme").addEventListener("click", () => {
    autoTheme = false; // 自動オフ
    manualTheme = (manualTheme === "light") ? "dark" : "light";
    applyTheme(manualTheme);
    localStorage.setItem("taskmgr_settings_" + domain, JSON.stringify({autoTheme, manualTheme}));
  });

  // 💾 状態保存
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("taskmgr_settings_" + domain, JSON.stringify({autoTheme, manualTheme}));
  });
})();
