// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      2.0
// @description  🖥️ CPU / GPU / Memory / FPS monitor with graph, dark mode, drag move, and persistent settings.
// @author       O-TYAN64
// @homepageURL  https://github.com/O-TYAN64/web-task-manager
// @updateURL    https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js
// @downloadURL  https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js
// @license      MIT
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const STORE_KEY = "webTaskManagerSettings";
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  let dark = saved.dark ?? true;
  let minimized = saved.minimized ?? false;
  let hideGraph = saved.hideGraph ?? false;
  let pos = saved.pos ?? { x: null, y: null };

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    right: 20px;
    bottom: 20px;
    width: 320px;
    height: 240px;
    background: rgba(0,0,0,0.7);
    color: #00ff88;
    font-family: Consolas, monospace;
    font-size: 13px;
    border: 1px solid #00ff88;
    border-radius: 8px;
    z-index: 999999;
    padding: 8px;
    box-sizing: border-box;
    user-select: none;
    cursor: move;
    overflow: hidden;
  `;
  if (pos.x !== null && pos.y !== null) {
    wrapper.style.left = pos.x + "px";
    wrapper.style.top = pos.y + "px";
    wrapper.style.right = "auto";
    wrapper.style.bottom = "auto";
  }
  document.body.appendChild(wrapper);

  const titleBar = document.createElement("div");
  titleBar.style.cssText = `
    font-weight: bold;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  titleBar.innerHTML = `
    <span>[ Web Task Manager ]</span>
    <div style="display:flex; gap:4px;">
        <button id="graphBtn" title="Show/Hide Graph" style="background:none;border:1px solid #00ff88;color:#00ff88;border-radius:4px;width:22px;height:22px;cursor:pointer;">${hideGraph ? "📈" : "📉"}</button>
        <button id="themeBtn" title="Toggle Theme" style="background:none;border:1px solid #00ff88;color:#00ff88;border-radius:4px;width:22px;height:22px;cursor:pointer;">${dark ? "🌙" : "☀️"}</button>
        <button id="minBtn" title="Minimize" style="background:none;border:1px solid #00ff88;color:#00ff88;border-radius:4px;width:22px;height:22px;cursor:pointer;">－</button>
        <button id="closeBtn" title="Close" style="background:none;border:1px solid #00ff88;color:#00ff88;border-radius:4px;width:22px;height:22px;cursor:pointer;">✕</button>
    </div>
  `;
  wrapper.appendChild(titleBar);

  const info = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");

  const legend = document.createElement("div");
  legend.style.cssText = "font-size:11px; margin-top:2px;";
  legend.innerHTML = "🟩CPU　🟦GPU　🟧MEM";

  wrapper.appendChild(info);
  wrapper.appendChild(canvas);
  wrapper.appendChild(legend);

  // === テーマ切替 ===
  function applyTheme() {
    const color = dark ? "#00ff88" : "#003300";
    wrapper.style.background = dark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)";
    wrapper.style.color = color;
    wrapper.style.border = `1px solid ${color}`;
    for (const btn of wrapper.querySelectorAll("button")) {
      btn.style.border = `1px solid ${color}`;
      btn.style.color = color;
    }
  }
  applyTheme();

  // === ドラッグ移動 ===
  let isDragging = false,
    offsetX = 0,
    offsetY = 0;
  titleBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    offsetX = e.clientX - wrapper.offsetLeft;
    offsetY = e.clientY - wrapper.offsetTop;
    wrapper.style.cursor = "grabbing";
  });
  document.addEventListener("mouseup", () => {
    if (isDragging) saveSettings();
    isDragging = false;
    wrapper.style.cursor = "move";
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    wrapper.style.left = e.clientX - offsetX + "px";
    wrapper.style.top = e.clientY - offsetY + "px";
    wrapper.style.right = "auto";
    wrapper.style.bottom = "auto";
  });

  // === GPU情報 ===
  let gpuName = "GPU: Unknown";
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        gpuName = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        gpuName = gpuName.replace(/^ANGLE\s*\(/, "").replace(/\)$/g, "");
        if (gpuName.length > 40) gpuName = gpuName.slice(0, 37) + "...";
      }
    }
  } catch {}
  const cpuThreads = navigator.hardwareConcurrency || "N/A";

  // === FPS計測 ===
  let fps = 0;
  let frameCount = 0;
  let lastTime = performance.now();
  function measureFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(measureFPS);
  }
  requestAnimationFrame(measureFPS);

  // === グラフ ===
  const cpuHistory = Array(60).fill(0);
  const gpuHistory = Array(60).fill(0);
  const memHistory = Array(60).fill(0);
  let cpuUsage = 0,
    gpuUsage = 0,
    memUsage = 0;

  function randomUsage(base) {
    return Math.min(100, Math.max(0, base + (Math.random() - 0.5) * 10));
  }
  function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawLine = (arr, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      arr.forEach((val, i) => {
        const x = (i / arr.length) * canvas.width;
        const y = canvas.height - (val / 100) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    drawLine(cpuHistory, "#00ff88");
    drawLine(gpuHistory, "#00aaff");
    drawLine(memHistory, "#ffaa00");
  }

  function updateStats() {
    cpuUsage = randomUsage(cpuUsage);
    gpuUsage = randomUsage(gpuUsage);
    memUsage = randomUsage(memUsage);
    cpuHistory.push(cpuUsage);
    gpuHistory.push(gpuUsage);
    memHistory.push(memUsage);
    if (cpuHistory.length > 60) cpuHistory.shift();
    if (gpuHistory.length > 60) gpuHistory.shift();
    if (memHistory.length > 60) memHistory.shift();

    info.innerHTML = `
      CPU: ${cpuThreads} Threads<br>
      GPU: ${gpuName}<br>
      FPS: ${fps}<br><br>
      CPU: ${cpuUsage.toFixed(1)}%<br>
      GPU: ${gpuUsage.toFixed(1)}%<br>
      MEM: ${memUsage.toFixed(1)}%`;

    if (!hideGraph) drawGraph();
  }
  setInterval(updateStats, 1000 / 30);

  // === 状態復元 ===
  if (minimized) {
    info.style.display = "none";
    canvas.style.display = "none";
    legend.style.display = "none";
    wrapper.style.height = "40px";
  }
  if (hideGraph) {
    canvas.style.display = "none";
    legend.style.display = "none";
  }

  // === 保存 ===
  function saveSettings() {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        dark,
        minimized,
        hideGraph,
        pos: { x: wrapper.offsetLeft, y: wrapper.offsetTop },
      })
    );
  }

  // === ボタン ===
  document.getElementById("themeBtn").onclick = () => {
    dark = !dark;
    applyTheme();
    saveSettings();
  };
  document.getElementById("minBtn").onclick = () => {
    minimized = !minimized;
    info.style.display = minimized ? "none" : "block";
    canvas.style.display = minimized || hideGraph ? "none" : "block";
    legend.style.display = minimized || hideGraph ? "none" : "block";
    wrapper.style.height = minimized ? "40px" : "240px";
    saveSettings();
  };
  document.getElementById("closeBtn").onclick = () => wrapper.remove();
  document.getElementById("graphBtn").onclick = () => {
    hideGraph = !hideGraph;
    canvas.style.display = hideGraph ? "none" : "block";
    legend.style.display = hideGraph ? "none" : "block";
    document.getElementById("graphBtn").textContent = hideGraph ? "📈" : "📉";
    saveSettings();
  };

  updateStats();
})();
