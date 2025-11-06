// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      7.0
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

  const container = document.createElement("div");
  container.id = "taskmgr";
  container.innerHTML = `
    <style>
      #taskmgr {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: var(--bg);
        color: var(--text);
        font-family: 'Segoe UI', sans-serif;
        transition: background 0.3s, color 0.3s;
        z-index: 999999;
        user-select: none;
        backdrop-filter: blur(8px);
        padding: 6px;
      }
      :root {
        --bg: rgba(0,0,0,0.45);
        --text: #fff;
        --cpu: #00ff88;
        --gpu: #00aaff;
        --mem: #ffaa00;
        --net: #ff66cc;
      }
      body.light {
        --bg: rgba(255,255,255,0.6);
        --text: #000;
      }
      #tmgr-controls {
        position: absolute;
        top: 8px;
        right: 12px;
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
      #tmgr-stats {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        margin-top: 10px;
      }
      .stat {
        text-align: center;
        width: 25%;
      }
      canvas {
        width: 100%;
        height: 50px;
      }
    </style>
    <div id="tmgr-controls">
      <button id="toggleTheme">🌓</button>
    </div>
    <canvas id="tmgr-graph"></canvas>
    <div id="tmgr-stats">
      <div class="stat" id="cpu">CPU 0%</div>
      <div class="stat" id="gpu">GPU 0%</div>
      <div class="stat" id="mem">MEM 0%</div>
      <div class="stat" id="net">NET 0 Mbps</div>
    </div>
  `;
  document.body.appendChild(container);

  /****************************
   * 🎨 テーマ制御部
   ****************************/
  function applyTheme(theme) {
    if (theme === "light") document.body.classList.add("light");
    else document.body.classList.remove("light");
  }

  function detectPageBrightness() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const rgb = bg.match(/\d+/g)?.map(Number);
    if (!rgb) return 0;
    return (rgb[0]*0.299 + rgb[1]*0.587 + rgb[2]*0.114);
  }

  function autoAdjustTheme() {
    const b = detectPageBrightness();
    if (b > 160) { applyTheme("light"); manualTheme = "light"; }
    else { applyTheme("dark"); manualTheme = "dark"; }
  }

  if (autoTheme) autoAdjustTheme(); else applyTheme(manualTheme);

  document.getElementById("toggleTheme").addEventListener("click", () => {
    autoTheme = false;
    manualTheme = manualTheme === "light" ? "dark" : "light";
    applyTheme(manualTheme);
    localStorage.setItem("taskmgr_settings_" + domain, JSON.stringify({autoTheme, manualTheme}));
  });

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("taskmgr_settings_" + domain, JSON.stringify({autoTheme, manualTheme}));
  });

  /****************************
   * 📊 モニタ部
   ****************************/
  const canvas = document.getElementById("tmgr-graph");
  const ctx = canvas.getContext("2d");
  canvas.width = 400;
  canvas.height = 60;

  const hist = { cpu: Array(60).fill(0), gpu: Array(60).fill(0), mem: Array(60).fill(0), net: Array(60).fill(0) };

  let cpuUsage=0,gpuUsage=0,memUsage=0,netUsage=0;
  let netDown=0,netUp=0;
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    const clone = res.clone();
    const buf = await clone.arrayBuffer().catch(()=>new ArrayBuffer(0));
    netDown += buf.byteLength;
    return res;
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(data) {
    if (data) netUp += data.length || 0;
    this.addEventListener("loadend", () => {
      if (this.response && typeof this.response === "string") netDown += this.response.length;
    });
    origSend.apply(this, arguments);
  };

  const gl = document.createElement("canvas").getContext("webgl");

  function measureCPU() {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) Math.sqrt(i);
    const end = performance.now();
    cpuUsage = Math.min(100, (end - start) * 4);
  }

  function measureGPU() {
    if (!gl) return;
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) gl.clear(gl.COLOR_BUFFER_BIT);
    const t1 = performance.now();
    gpuUsage = Math.min(100, (t1 - t0));
  }

  function measureMEM() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize / 1048576;
      const total = performance.memory.jsHeapSizeLimit / 1048576;
      memUsage = (used / total) * 100;
    }
  }

  function measureNET() {
    netUsage = ((netDown + netUp) / 1024 / 1024) * 8;
    netDown = netUp = 0;
  }

  function updateHistory() {
    hist.cpu.push(cpuUsage); hist.cpu.shift();
    hist.gpu.push(gpuUsage); hist.gpu.shift();
    hist.mem.push(memUsage); hist.mem.shift();
    hist.net.push(netUsage); hist.net.shift();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = { cpu: "#00ff88", gpu: "#00aaff", mem: "#ffaa00", net: "#ff66cc" };
    Object.entries(hist).forEach(([key, arr]) => {
      ctx.beginPath();
      ctx.strokeStyle = colors[key];
      for (let i = 0; i < arr.length; i++) {
        const x = (i / arr.length) * canvas.width;
        const y = canvas.height - (arr[i] / 100) * canvas.height;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    document.getElementById("cpu").textContent = `CPU ${cpuUsage.toFixed(1)}%`;
    document.getElementById("gpu").textContent = `GPU ${gpuUsage.toFixed(1)}%`;
    document.getElementById("mem").textContent = `MEM ${memUsage.toFixed(1)}%`;
    document.getElementById("net").textContent = `NET ${netUsage.toFixed(2)} Mbps`;
  }

  setInterval(() => {
    measureCPU(); measureGPU(); measureMEM(); measureNET();
    updateHistory(); draw();
  }, 1000);
})();
