// ==UserScript==
// @name         Web Task Manager
// @namespace    https://github.com/O-TYAN64/web-task-manager
// @version      6.0
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

    /**********************
     * 🧩 設定と初期UI生成
     **********************/
    const root = document.createElement("div");
    Object.assign(root.style, {
        position: "fixed",
        bottom: "10px",
        left: "10px",
        width: "320px",
        height: "160px",
        background: "rgba(0,0,0,0.55)",
        borderRadius: "10px",
        color: "#fff",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 999999,
        backdropFilter: "blur(6px)",
        overflow: "hidden",
        padding: "8px"
    });
    document.body.appendChild(root);

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 80;
    root.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const info = document.createElement("div");
    root.appendChild(info);

    /**********************
     * 📊 データ履歴
     **********************/
    const hist = {
        cpu: Array(60).fill(0),
        gpu: Array(60).fill(0),
        mem: Array(60).fill(0),
        net: Array(60).fill(0),
    };

    /**********************
     * ⚙️ CPUモニタ
     **********************/
    let lastTime = performance.now();
    let cpuUsage = 0;

    function measureCPU() {
        const start = performance.now();
        // 負荷計測（小ループ）
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
        for (let i = 0; i < 10000; i++) {
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
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
            const usedMB = performance.memory.usedJSHeapSize / 1048576;
            const totalMB = performance.memory.jsHeapSizeLimit / 1048576;
            memUsage = (usedMB / totalMB) * 100;
        } else {
            memUsage = 0;
        }
        hist.mem.push(memUsage);
        hist.mem.shift();
    }

    /**********************
     * 🌐 ネットワークモニタ
     **********************/
    let netDown = 0, netUp = 0;
    let netTotal = 0;

    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const res = await origFetch.apply(this, args);
        const clone = res.clone();
        const data = await clone.arrayBuffer().catch(()=>new ArrayBuffer(0));
        netDown += data.byteLength;
        return res;
    };

    (function() {
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(data) {
            if (data) netUp += data.length || 0;
            this.addEventListener("loadend", () => {
                if (this.response) netDown += this.response.length || 0;
            });
            origSend.apply(this, arguments);
        };
    })();

    function measureNET() {
        netTotal = (netDown + netUp) / 1024 / 1024; // MB
        hist.net.push(netTotal * 8); // Mbps換算
        hist.net.shift();
        netDown = 0;
        netUp = 0;
    }

    /**********************
     * 🎨 グラフ描画
     **********************/
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
            `CPU ${cpuUsage.toFixed(1)}%　` +
            `GPU ${gpuUsage.toFixed(1)}%　` +
            `MEM ${memUsage.toFixed(1)}%　` +
            `NET ${(hist.net.at(-1)).toFixed(2)} Mbps`;
    }

    /**********************
     * 🔁 更新ループ
     **********************/
    setInterval(() => {
        measureCPU();
        measureGPU();
        measureMEM();
        measureNET();
        draw();
    }, 1000);
})();
