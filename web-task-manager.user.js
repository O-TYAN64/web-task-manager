// ==UserScript==
// @name         Web Task Manager (Dark Site Visible Edition)
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      12.0
// @description  CPU / GPU / Memory / FPS monitor with compact mode, transparency, dark-site support, and persistent position
// @author       O-TYAN
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const UPDATE_INTERVAL = 200;
  const MEMORY_EST_TOTAL_MB = navigator.deviceMemory ? navigator.deviceMemory * 1024 : 8192;

  /*************** UI ***************/
  const box = document.createElement("div");
  const header = document.createElement("div");
  const body = document.createElement("div");
  const canvas = document.createElement("canvas");
  const info = document.createElement("div");
  const opacitySlider = document.createElement("input");
  const compactBtn = document.createElement("button");

  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    left: "20px",
    width: localStorage.getItem("wtm-width") || "320px",
    height: localStorage.getItem("wtm-height") || "170px",
    background: "rgba(20,20,20,0.85)",
    borderRadius: "10px",
    fontFamily: "Consolas, monospace",
    fontSize: "12px",
    color: "#ccf",
    zIndex: 9999999,
    resize: "both",
    overflow: "hidden",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    userSelect: "none",
  });

  // restore saved position
  const savedX = localStorage.getItem("wtm-left");
  const savedY = localStorage.getItem("wtm-top");
  if (savedX && savedY) {
    box.style.left = savedX + "px";
    box.style.top = savedY + "px";
    box.style.bottom = "auto";
  }

  header.innerHTML = `<b>Web Task Manager</b>`;
  Object.assign(header.style, {
    cursor: "move",
    padding: "4px 8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(0,255,255,0.1)"
  });

  compactBtn.textContent = "🗕";
  Object.assign(compactBtn.style, {
    background: "none",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    fontSize: "14px",
  });
  header.appendChild(compactBtn);

  opacitySlider.type = "range";
  opacitySlider.min = 0.3;
  opacitySlider.max = 1.0;
  opacitySlider.step = 0.05;
  opacitySlider.value = localStorage.getItem("wtm-opacity") || 0.85;
  Object.assign(opacitySlider.style, {
    width: "100%",
    cursor: "pointer",
  });

  canvas.width = 300;
  canvas.height = 80;
  Object.assign(canvas.style, { width: "100%", display: "block" });
  Object.assign(info.style, { padding: "4px 8px", whiteSpace: "pre-line" });

  body.appendChild(canvas);
  body.appendChild(info);
  body.appendChild(opacitySlider);
  box.appendChild(header);
  box.appendChild(body);
  document.body.appendChild(box);

  /*************** 移動 ***************/
  let dragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener("mousedown", e => {
    dragging = true;
    offsetX = e.clientX - box.offsetLeft;
    offsetY = e.clientY - box.offsetTop;
  });
  document.addEventListener("mouseup", () => dragging = false);
  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    box.style.left = e.clientX - offsetX + "px";
    box.style.top = e.clientY - offsetY + "px";
    box.style.bottom = "auto";
    localStorage.setItem("wtm-left", parseInt(box.style.left));
    localStorage.setItem("wtm-top", parseInt(box.style.top));
  });

  /*************** サイズ記録 ***************/
  new ResizeObserver(() => {
    localStorage.setItem("wtm-width", box.offsetWidth);
    localStorage.setItem("wtm-height", box.offsetHeight);
  }).observe(box);

  /*************** コンパクトモード ***************/
  let compact = false;
  compactBtn.onclick = () => {
    compact = !compact;
    body.style.display = compact ? "none" : "block";
  };

  /*************** データ履歴 ***************/
  const hist = { cpu: Array(60).fill(0), gpu: Array(60).fill(0), mem: Array(60).fill(0), net: Array(60).fill(0) };

  let cpuUsage = 0, gpuUsage = 0, memUsage = 0, netRate = 0, fps = 0;
  const gl = document.createElement("canvas").getContext("webgl");

  function measureCPU() {
    const start = performance.now();
    for (let i = 0; i < 30000; i++) Math.sqrt(i);
    const end = performance.now();
    cpuUsage = Math.min(100, (end - start) * 6);
    hist.cpu.push(cpuUsage); hist.cpu.shift();
  }

  function measureGPU() {
    if (!gl) return;
    const t0 = performance.now();
    for (let i = 0; i < 3000; i++) gl.clear(gl.COLOR_BUFFER_BIT);
    const t1 = performance.now();
    gpuUsage = Math.min(100, (t1 - t0) * 5);
    hist.gpu.push(gpuUsage); hist.gpu.shift();
  }

  function measureMEM() {
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1048576;
      memUsage = Math.min(100, (usedMB / MEMORY_EST_TOTAL_MB) * 100);
    } else {
      memUsage = Math.min(100, (memUsage * 0.9) + (cpuUsage * 0.1));
    }
    hist.mem.push(memUsage); hist.mem.shift();
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
      if (this.response) netDown += (this.response.length || 0);
    });
    origSend.apply(this, arguments);
  };

  function measureNET() {
    netRate = (netDown + netUp) / 1024 / 1024 * 8;
    hist.net.push(netRate); hist.net.shift();
    netDown = netUp = 0;
  }

  /*************** グラフ ***************/
  const ctx = canvas.getContext("2d");
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = { cpu: "#00ff88", gpu: "#88ccff", mem: "#ffaa00", net: "#ff66cc" };
    for (const [key, color] of Object.entries(colors)) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      const data = hist[key];
      for (let i = 0; i < data.length; i++) {
        const x = (i / data.length) * canvas.width;
        const y = canvas.height - (data[i] / 100) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    info.innerText = `FPS ${fps.toFixed(1)} | CPU ${cpuUsage.toFixed(1)}% | GPU ${gpuUsage.toFixed(1)}% | MEM ${memUsage.toFixed(1)}% | NET ${netRate.toFixed(2)} Mbps`;
  }

  /*************** FPS測定 ***************/
  let lastTime = performance.now();
  function fpsLoop(now) {
    fps = 1000 / (now - lastTime);
    lastTime = now;
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  /*************** テーマ自動検出 ***************/
  function detectTheme() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    if (!bg) return;
    const rgb = bg.match(/\d+/g);
    if (!rgb) return;
    const brightness = (rgb[0]*0.299 + rgb[1]*0.587 + rgb[2]*0.114);
    if (brightness > 128) {
      box.style.background = `rgba(255,255,255,${opacitySlider.value})`;
      box.style.color = "#111";
      header.style.background = "rgba(240,240,240,0.9)";
    } else {
      box.style.background = `rgba(20,20,20,${opacitySlider.value})`;
      box.style.color = "#ccf";
      header.style.background = "rgba(0,255,255,0.1)";
    }
  }
  setInterval(detectTheme, 2000);

  /*************** 透明度変更 ***************/
  opacitySlider.addEventListener("input", () => {
    localStorage.setItem("wtm-opacity", opacitySlider.value);
    detectTheme();
  });

  /*************** 更新ループ ***************/
  setInterval(() => {
    measureCPU(); measureGPU(); measureMEM(); measureNET(); draw();
  }, UPDATE_INTERVAL);
})();
