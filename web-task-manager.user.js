// ==UserScript==
// @name         Web Task Manager (Dark Site Visible Edition)
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      16.0
// @description  CPU / GPU / Memory / FPS monitor with compact mode, transparency, dark-site support, and persistent position
// @author       O-TYAN
// @homepageURL  https://github.com/O-TYAN64/web-task-manager
// @updateURL    https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js
// @match        *://*/*
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const UPDATE_INTERVAL = 1000; // ★ 1秒更新（重要）
  const HISTORY_LEN = 60;       // ★ 60秒分
  const MEMORY_EST_TOTAL_MB = navigator.deviceMemory
    ? navigator.deviceMemory * 1024
    : 8192;

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
    width: "320px",
    height: "170px",
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
  compactBtn.style.background = "none";
  compactBtn.style.border = "none";
  compactBtn.style.color = "inherit";
  compactBtn.style.cursor = "pointer";
  header.appendChild(compactBtn);

  opacitySlider.type = "range";
  opacitySlider.min = 0.3;
  opacitySlider.max = 1.0;
  opacitySlider.step = 0.05;
  opacitySlider.value = 0.85;

  Object.assign(info.style, { padding: "4px 8px", whiteSpace: "pre-line" });

  body.append(canvas, info, opacitySlider);
  box.append(header, body);
  document.body.appendChild(box);

  /*************** Canvas ***************/
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = box.clientWidth - 16;
    canvas.height = 80;
  }
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(box);

  /*************** Drag ***************/
  let drag = false, ox = 0, oy = 0;
  header.onmousedown = e => {
    drag = true;
    ox = e.clientX - box.offsetLeft;
    oy = e.clientY - box.offsetTop;
  };
  document.onmouseup = () => (drag = false);
  document.onmousemove = e => {
    if (!drag) return;
    box.style.left = e.clientX - ox + "px";
    box.style.top = e.clientY - oy + "px";
    box.style.bottom = "auto";
  };

  /*************** Compact ***************/
  let compact = false;
  compactBtn.onclick = () => {
    compact = !compact;
    body.style.display = compact ? "none" : "block";
  };

  /*************** Ring Buffers ***************/
  const hist = {
    cpu: new Array(HISTORY_LEN).fill(0),
    gpu: new Array(HISTORY_LEN).fill(0),
    mem: new Array(HISTORY_LEN).fill(0),
    net: new Array(HISTORY_LEN).fill(0),
  };
  let ptr = 0;

  let cpu = 0, gpu = 0, mem = 0, net = 0, fps = 0;
  const gl = document.createElement("canvas").getContext("webgl");

  function push(v, key) {
    hist[key][ptr] = v;
  }

  /*************** Measure ***************/
  function measureCPU() {
    const t = performance.now();
    for (let i = 0; i < 30000; i++) Math.sqrt(i);
    cpu = Math.min(100, (performance.now() - t) * 6);
    push(cpu, "cpu");
  }

  function measureGPU() {
    if (!gl) return;
    const t = performance.now();
    for (let i = 0; i < 3000; i++) gl.clear(gl.COLOR_BUFFER_BIT);
    gpu = Math.min(100, (performance.now() - t) * 5);
    push(gpu, "gpu");
  }

  function measureMEM() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize / 1048576;
      mem = Math.min(100, (used / MEMORY_EST_TOTAL_MB) * 100);
    }
    push(mem, "mem");
  }

  let down = 0, up = 0;
  const ofetch = fetch;
  fetch = async (...a) => {
    const r = await ofetch(...a);
    const l = r.headers.get("content-length");
    if (l) down += +l;
    return r;
  };

  function measureNET() {
    net = ((down + up) * 8) / 1024 / 1024; // Mbps / 秒
    push(net, "net");
    down = up = 0;
  }

  /*************** Draw ***************/
  function draw() {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const colors = {
      cpu: "#00ff88",
      gpu: "#88ccff",
      mem: "#ffaa00",
      net: "#ff66cc"
    };

    for (const key in colors) {
      ctx.beginPath();
      ctx.strokeStyle = colors[key];
      for (let i = 0; i < HISTORY_LEN; i++) {
        const idx = (ptr + i) % HISTORY_LEN;
        const x = Math.round(i / (HISTORY_LEN - 1) * canvas.width);
        const y =
          canvas.height -
          Math.min(1, hist[key][idx] / 100) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    info.textContent =
      `FPS ${fps.toFixed(1)} | CPU ${cpu.toFixed(1)}% | GPU ${gpu.toFixed(1)}% | MEM ${mem.toFixed(1)}% | NET ${net.toFixed(2)} Mbps`;
  }

  /*************** FPS ***************/
  let last = performance.now();
  function fpsLoop(t) {
    fps = fps * 0.9 + (1000 / (t - last)) * 0.1;
    last = t;
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  /*************** Update ***************/
  setInterval(() => {
    measureCPU();
    measureGPU();
    measureMEM();
    measureNET();
    ptr = (ptr + 1) % HISTORY_LEN;
    draw(); // ★ 1回だけ
  }, UPDATE_INTERVAL);
})();
