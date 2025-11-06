// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      10.0
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
  'use strict';

  const UPDATE_INTERVAL = 1000;
  const MEMORY_EST_TOTAL_MB = navigator.deviceMemory ? navigator.deviceMemory * 1024 : 8192;

  /**********************
   * 💠 UI生成
   **********************/
  const box = document.createElement("div");
  const header = document.createElement("div");
  const body = document.createElement("div");
  const canvas = document.createElement("canvas");
  const info = document.createElement("div");

  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    width: "320px",
    height: "160px",
    borderRadius: "10px",
    fontFamily: "Consolas, monospace",
    fontSize: "12px",
    zIndex: 999999,
    userSelect: "none",
    overflow: "hidden",
    resize: "both", // ← 💡サイズ変更できる
    transition: "all 0.3s ease",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)"
  });

  header.innerHTML = `
    <span id="wtm-title">[ Web Task Manager ]</span>
    <div style="float:right;">
      <button id="wtm-min" style="background:none;border:none;font-size:14px;cursor:pointer;">−</button>
    </div>`;

  Object.assign(header.style, {
    padding: "4px 8px",
    cursor: "move",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  });

  canvas.width = 300;
  canvas.height = 80;
  Object.assign(canvas.style, {
    width: "100%",
    display: "block"
  });
  Object.assign(info.style, { padding: "4px 8px" });
  Object.assign(body.style, { padding: "4px 8px" });
  body.appendChild(canvas);
  body.appendChild(info);
  box.appendChild(header);
  box.appendChild(body);
  document.body.appendChild(box);

  /**********************
   * 🖱 ドラッグ移動
   **********************/
  let dragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - box.offsetLeft;
    offsetY = e.clientY - box.offsetTop;
  });
  document.addEventListener("mouseup", () => dragging = false);
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    box.style.left = e.clientX - offsetX + "px";
    box.style.top = e.clientY - offsetY + "px";
    box.style.bottom = "auto";
  });

  /**********************
   * ➖ 最小化
   **********************/
  document.getElementById("wtm-min").onclick = () => {
    body.style.display = body.style.display === "none" ? "block" : "none";
  };

  /**********************
   * 📈 データ履歴
   **********************/
  const hist = {
    cpu: Array(60).fill(0),
    gpu: Array(60).fill(0),
    mem: Array(60).fill(0),
    net: Array(60).fill(0)
  };

  /**********************
   * ⚙️ モニタ関数
   **********************/
  let cpuUsage = 0, gpuUsage = 0, memUsage = 0, netRate = 0;
  const gl = document.createElement("canvas").getContext("webgl");

  function measureCPU() {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) Math.sqrt(i);
    const end = performance.now();
    cpuUsage = Math.min(100, (end - start) * 4);
    hist.cpu.push(cpuUsage); hist.cpu.shift();
  }

  function measureGPU() {
    if (!gl) return;
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) gl.clear(gl.COLOR_BUFFER_BIT);
    const t1 = performance.now();
    gpuUsage = Math.min(100, (t1 - t0));
    hist.gpu.push(gpuUsage); hist.gpu.shift();
  }

  function measureMEM() {
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1048576;
      memUsage = Math.min(100, (usedMB / MEMORY_EST_TOTAL_MB) * 100);
    }
    hist.mem.push(memUsage);
    hist.mem.shift();
  }

  let netDown = 0, netUp = 0;
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    const clone = res.clone();
    const data = await clone.arrayBuffer().catch(() => new ArrayBuffer(0));
    netDown += data.byteLength;
    return res;
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (data) {
    if (data) netUp += data.length || 0;
    this.addEventListener("loadend", () => {
      if (this.response) netDown += this.response.length || 0;
    });
    origSend.apply(this, arguments);
  };

  function measureNET() {
    netRate = (netDown + netUp) / 1024 / 1024 * 8;
    hist.net.push(netRate);
    hist.net.shift();
    netDown = netUp = 0;
  }

  /**********************
   * 🎨 グラフ描画
   **********************/
  const ctx = canvas.getContext("2d");
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = {
      cpu: theme === "dark" ? "#00ff88" : "#009944",
      gpu: theme === "dark" ? "#88ccff" : "#0066cc",
      mem: theme === "dark" ? "#ffaa00" : "#cc6600",
      net: theme === "dark" ? "#ff66cc" : "#cc0099"
    };
    for (const [key, color] of Object.entries(colors)) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      const data = hist[key];
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * canvas.width;
        const y = canvas.height - (data[i] / 100) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    info.innerText =
      `CPU ${cpuUsage.toFixed(1)}%　GPU ${gpuUsage.toFixed(1)}%　MEM ${memUsage.toFixed(1)}%　NET ${netRate.toFixed(2)} Mbps`;
  }

  /**********************
   * 🎞 FPS表示（常に最前面）
   **********************/
  const fpsBox = document.createElement("div");
  Object.assign(fpsBox.style, {
    position: "fixed",
    top: "8px",
    left: "8px",
    padding: "3px 6px",
    fontFamily: "Consolas, monospace",
    fontSize: "13px",
    borderRadius: "4px",
    zIndex: 1000000,
    pointerEvents: "none",
    background: "rgba(0,0,0,0.5)",
    color: "#0f0"
  });
  document.body.appendChild(fpsBox);

  let lastTime = performance.now(), fps = 0;
  function fpsLoop(now) {
    fps = 1000 / (now - lastTime);
    lastTime = now;
    fpsBox.textContent = `FPS: ${fps.toFixed(1)}`;
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  /**********************
   * 🌓 自動テーマ切替
   **********************/
  let theme = "dark";
  function detectTheme() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    if (!bg) return;
    const rgb = bg.match(/\d+/g);
    if (!rgb) return;
    const brightness = (rgb[0]*0.299 + rgb[1]*0.587 + rgb[2]*0.114);
    const newTheme = brightness > 128 ? "light" : "dark";
    if (newTheme !== theme) applyTheme(newTheme);
  }

  function applyTheme(mode) {
    theme = mode;
    if (mode === "light") {
      box.style.background = "rgba(255,255,255,0.9)";
      box.style.color = "#222";
      box.style.border = "1px solid #999";
      header.style.background = "rgba(240,240,240,0.9)";
    } else {
      box.style.background = "rgba(20,20,20,0.85)";
      box.style.color = "#ccf";
      box.style.border = "1px solid #3af";
      header.style.background = "rgba(0,255,255,0.1)";
    }
  }

  setInterval(detectTheme, 2000);

  /**********************
   * ⏱ 更新ループ
   **********************/
  setInterval(() => {
    measureCPU();
    measureGPU();
    measureMEM();
    measureNET();
    draw();
  }, UPDATE_INTERVAL);
})();
