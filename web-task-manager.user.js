// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      8.0
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

  /**********************
   * 🎨 外観設定
   **********************/
  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    width: "320px",
    background: "rgba(20,20,20,0.85)",
    border: "1px solid #3af",
    borderRadius: "10px",
    color: "#ccf",
    fontFamily: "Consolas, monospace",
    fontSize: "12px",
    zIndex: 999999,
    boxShadow: "0 0 12px rgba(0,255,255,0.3)",
    userSelect: "none",
    backdropFilter: "blur(6px)",
    overflow: "hidden"
  });

  box.innerHTML = `
    <div id="wtm-header" style="
      background: rgba(0,255,255,0.1);
      padding: 4px 8px;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <span style="color:#6ff;">[ Web Task Manager ]</span>
      <div>
        <button id="wtm-min" style="background:transparent;border:none;color:#6ff;font-size:14px;cursor:pointer;">−</button>
        <button id="wtm-close" style="background:transparent;border:none;color:#f66;font-size:14px;cursor:pointer;">×</button>
      </div>
    </div>
    <div id="wtm-body" style="padding:8px;">
      <canvas id="wtm-canvas" width="300" height="80" style="width:100%;display:block;"></canvas>
      <div id="wtm-info" style="padding-top:4px;">CPU 0%　GPU 0%　MEM 0%　NET 0 Mbps</div>
    </div>
  `;
  document.body.appendChild(box);

  /**********************
   * 🖱 ドラッグ移動
   **********************/
  const header = box.querySelector("#wtm-header");
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
   * ❌ 閉じる・最小化
   **********************/
  document.getElementById("wtm-close").onclick = () => box.remove();
  const body = document.getElementById("wtm-body");
  document.getElementById("wtm-min").onclick = () => {
    body.style.display = (body.style.display === "none") ? "block" : "none";
  };

  /**********************
   * 📊 データ履歴
   **********************/
  const hist = {
    cpu: Array(60).fill(0),
    gpu: Array(60).fill(0),
    mem: Array(60).fill(0),
    net: Array(60).fill(0)
  };

  /**********************
   * ⚙️ CPUモニタ
   **********************/
  let cpuUsage = 0;
  function measureCPU() {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) Math.sqrt(i);
    const end = performance.now();
    cpuUsage = Math.min(100, (end - start) * 4);
    hist.cpu.push(cpuUsage);
    hist.cpu.shift();
  }

  /**********************
   * 🎮 GPUモニタ
   **********************/
  const gl = document.createElement("canvas").getContext("webgl");
  let gpuUsage = 0;
  function measureGPU() {
    if (!gl) return;
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) gl.clear(gl.COLOR_BUFFER_BIT);
    const t1 = performance.now();
    gpuUsage = Math.min(100, (t1 - t0));
    hist.gpu.push(gpuUsage);
    hist.gpu.shift();
  }

  /**********************
   * 💾 メモリモニタ
   **********************/
  let memUsage = 0;
  function measureMEM() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize / 1048576;
      const total = performance.memory.jsHeapSizeLimit / 1048576;
      memUsage = (used / total) * 100;
    }
    hist.mem.push(memUsage);
    hist.mem.shift();
  }

  /**********************
   * 🌐 ネットワークモニタ
   **********************/
  let netDown = 0, netUp = 0, netTotal = 0;
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
    netTotal = (netDown + netUp) / 1024 / 1024;
    hist.net.push(netTotal * 8);
    hist.net.shift();
    netDown = 0; netUp = 0;
  }

  /**********************
   * 🎨 グラフ描画
   **********************/
  const canvas = document.getElementById("wtm-canvas");
  const ctx = canvas.getContext("2d");
  const info = document.getElementById("wtm-info");

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = {
      cpu: "#00ff88",
      gpu: "#88ccff",
      mem: "#ffaa00",
      net: "#ff66cc"
    };
    for (const [key, color] of Object.entries(colors)) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      const data = hist[key];
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * canvas.width;
        const y = canvas.height - (data[i] / 100) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    info.innerHTML =
      `CPU ${cpuUsage.toFixed(1)}%　GPU ${gpuUsage.toFixed(1)}%　MEM ${memUsage.toFixed(1)}%　NET ${(hist.net.at(-1)).toFixed(2)} Mbps`;
  }

  /**********************
   * 🕒 自動更新ループ
   **********************/
  setInterval(() => {
    measureCPU();
    measureGPU();
    measureMEM();
    measureNET();
    draw();
  }, 1000);

})();
