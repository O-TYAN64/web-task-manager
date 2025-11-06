# 🖥️ Web Task Manager (by O-TYAN64)

A lightweight, draggable web overlay that visualizes **CPU / GPU / Memory usage** in real time — right in your browser.  
Built with pure JavaScript, no dependencies required.

ブラウザ上で **CPU / GPU / メモリの使用率をリアルタイムで可視化** する軽量タスクマネージャー。  
純粋な JavaScript で動作し、追加ライブラリは不要です。

---

## ✨ Features | 機能

### English
- 📊 Real-time visualization of CPU, GPU, and memory usage  
- 🌙 Dark / ☀️ Light theme toggle  
- 🖱️ Movable (drag & drop) overlay window  
- ➕ Minimize / Expand / Close buttons  
- ⚡ No external libraries or frameworks  
- 🧠 Works on any webpage via Tampermonkey  

### 日本語
- 📊 CPU / GPU / メモリ使用率をリアルタイムでグラフ表示  
- 🌙 ダークモード／☀️ ライトモードの切り替え  
- 🖱️ ドラッグで自由に移動可能なオーバーレイ  
- ➕ 最小化・展開・閉じるボタン付き  
- ⚡ 追加ライブラリ不要の純粋な JavaScript 実装  
- 🧠 Tampermonkey 経由でどんなウェブページでも動作  

---

## 🧩 Installation | 導入方法

### English
1. Install **Tampermonkey** on your browser (Chrome / Firefox / Edge).  
2. Open the following URL to install the script:  
   👉 [Install Web Task Manager](https://github.com/O-TYAN64/web-task-manager/raw/main/web-task-manager.user.js)  
3. Allow Tampermonkey to add it.  
4. Visit any webpage — the overlay should appear at the bottom right corner.  

### 日本語
1. ブラウザ（Chrome / Firefox / Edge）に **Tampermonkey** をインストールします。  
2. 以下のリンクからスクリプトを開きます：  
   👉 [Web Task Manager をインストール](https://github.com/O-TYAN64/web-task-manager/raw/main/web-task-manager.user.js)  
3. Tampermonkey のインストール確認画面で「インストール」をクリックします。  
4. 任意のウェブページを開くと、右下にタスクマネージャーが表示されます。  

---

## ⚙️ Usage | 使い方

| Button | Function | 説明 |
|:------:|:----------|:----|
| 🌙 / ☀️ | Toggle theme | ダーク／ライトテーマ切り替え |
| － / ＋ | Minimize / Expand | 表示の最小化・展開 |
| ✕ | Close | ウィンドウを閉じる |
| Drag title bar | Move overlay | タイトルバーをドラッグで移動可能 |

---

## 🧠 System Info | システム情報

- GPU name is retrieved using `WEBGL_debug_renderer_info` (if available).  
- CPU thread count is based on `navigator.hardwareConcurrency`.  
- Usage values are simulated for demo purposes (future versions may include true stats).  

GPU 名は `WEBGL_debug_renderer_info` 拡張から取得しています（利用可能な場合）。  
CPU スレッド数は `navigator.hardwareConcurrency` に基づきます。  
使用率はデモ用にランダム生成されています（将来的に実測対応予定）。  

---
