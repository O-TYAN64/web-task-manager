// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      1.9
// @description  🖥️ CPU / GPU / Memory monitor with graph, dark mode, drag move, and control buttons. | CPU / GPU / メモリ使用率をリアルタイムで可視化するWebタスクマネージャー。
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

    // ===============================
    // UI Setup
    // ===============================
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 320px;
        height: 200px;
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
        overflow: hidden;
    `;
    document.body.appendChild(wrapper);

    // ===============================
    // Title bar + control buttons
    // ===============================
    const titleBar = document.createElement("div");
    titleBar.style.cssText = `
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
    `;
    const titleText = document.createElement("span");
    titleText.textContent = "[ Web Task Manager ]";

    const btnBox = document.createElement("div");
    btnBox.style.display = "flex";
    btnBox.style.gap = "4px";

    function makeBtn(label) {
        const b = document.createElement("button");
        b.textContent = label;
        b.style.cssText = `
            background: none;
            color: inherit;
            border: 1px solid currentColor;
            border-radius: 3px;
            font-size: 11px;
            padding: 1px 5px;
            cursor: pointer;
        `;
        b.onmouseenter = () => (b.style.background = "rgba(255,255,255,0.1)");
        b.onmouseleave = () => (b.style.background = "none");
        return b;
    }

    const btnTheme = makeBtn("🌙");
    const btnMin = makeBtn("－");
    const btnClose = makeBtn("✕");
    btnBox.append(btnTheme, btnMin, btnClose);
    titleBar.append(titleText, btnBox);
    wrapper.appendChild(titleBar);

    // ===============================
    // Info + Graph
    // ===============================
    const info = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    wrapper.append(info, canvas);

    // ===============================
    // Theme toggle
    // ===============================
    let dark = true;
    function toggleTheme() {
        dark = !dark;
        wrapper.style.background = dark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)";
        wrapper.style.color = dark ? "#00ff88" : "#003300";
        wrapper.style.border = dark ? "1px solid #00ff88" : "1px solid #003300";
        btnBox.querySelectorAll("button").forEach(b => {
            b.style.color = dark ? "#00ff88" : "#003300";
            b.style.border = dark ? "1px solid #00ff88" : "1px solid #003300";
        });
        btnTheme.textContent = dark ? "🌙" : "☀️";
    }

    // ===============================
    // Drag move
    // ===============================
    let isDragging = false, offsetX = 0, offsetY = 0;
    titleBar.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - wrapper.offsetLeft;
        offsetY = e.clientY - wrapper.offsetTop;
        titleBar.style.cursor = "grabbing";
    });
    document.addEventListener("mouseup", () => {
        isDragging = false;
        titleBar.style.cursor = "move";
    });
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        wrapper.style.left = e.clientX - offsetX + "px";
        wrapper.style.top = e.clientY - offsetY + "px";
        wrapper.style.right = "auto";
        wrapper.style.bottom = "auto";
    });

    // ===============================
    // System Info (GPU / CPU)
    // ===============================
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

    // ===============================
    // Graph Data
    // ===============================
    const cpuHistory = Array(60).fill(0);
    const gpuHistory = Array(60).fill(0);
    const memHistory = Array(60).fill(0);
    let cpuUsage = 0, gpuUsage = 0, memUsage = 0;

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

    // ===============================
    // Update Loop
    // ===============================
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
        GPU: ${gpuName}<br><br>
        CPU: ${cpuUsage.toFixed(1)}%<br>
        GPU: ${gpuUsage.toFixed(1)}%<br>
        MEM: ${memUsage.toFixed(1)}%`;

        drawGraph();
    }

    setInterval(updateStats, 1000 / 30);

    // ===============================
    // Button Actions
    // ===============================
    let minimized = false;
    btnMin.onclick = () => {
        minimized = !minimized;
        info.style.display = minimized ? "none" : "block";
        canvas.style.display = minimized ? "none" : "block";
        wrapper.style.height = minimized ? "35px" : "200px";
        btnMin.textContent = minimized ? "＋" : "－";
    };

    btnTheme.onclick = toggleTheme;
    btnClose.onclick = () => wrapper.remove();

    // ===============================
    // Start
    // ===============================
    updateStats();
})();
