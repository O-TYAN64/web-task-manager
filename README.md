<h1 align="center">🖥️ Web Task Manager</h1>

<p align="center">
  <b>by O-TYAN64</b><br>
  Realtime CPU / GPU / Memory / Network monitor for browsers.<br>
  ブラウザ上で動作する軽量リアルタイムタスクマネージャー。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-12.0-green?style=for-the-badge">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/Tampermonkey-Compatible-orange?style=for-the-badge">
</p>

---

## 🌟 Overview / 概要

**Web Task Manager** は、ブラウザ上で **CPU / GPU / メモリ / ネットワーク通信量** を  
リアルタイムで監視できる **Tampermonkey スクリプト** です。  
軽量・高精度・美しいUIで、どんなWebページでも動作します。

---

## 🧩 Features / 機能

| 機能 | 説明 |
|------|------|
| 🧠 **CPU / GPU / MEM / NET モニタリング** | 各種リソース使用率をリアルタイム監視（約30fps更新） |
| 📈 **折れ線グラフ描画** | CPU🟩 GPU🟦 MEM🟧 NET🟥 の履歴をCanvasで滑らかに描画 |
| 🎨 **自動テーマ検出** | YouTubeなどのダークテーマにも自動対応 |
| 🧱 **ドラッグ移動可能** | 画面上を自由に移動（位置は自動保存） |
| 💾 **状態永続化** | `localStorage` に位置・透明度・最小化状態を保存 |
| 🔳 **コンパクトモード** | 一目で分かる最小表示モード（クリックで展開） |
| 🌫️ **透明度スライダー** | UIの透過度をリアルタイム調整 |
| ⚡ **完全ネイティブ実装** | 外部ライブラリ不使用、純JSで軽量・高速 |

---

## 🧠 監視内容 / Monitored Metrics

| 種類 | 詳細 |
|------|------|
| **CPU** | Performance APIから算出された負荷率 |
| **GPU** | `WEBGL_debug_renderer_info`から取得 |
| **MEM** | `performance.memory.usedJSHeapSize` を使用 |
| **NET** | `navigator.connection` または転送バイト数から通信速度を推定 |

---

## 🕹️ Controls / 操作方法

| 操作 | 説明 |
|------|------|
| 🔹 **ドラッグ** | 任意の場所に移動 |
| 🔹 **－ボタン** | コンパクトモード切替 |
| 🔹 **⚙️ボタン** | 設定メニュー（透明度・テーマ切替） |
| 🔹 **クリック** | 折れ線グラフのON/OFF切替 |

---

## 💾 Persistent Settings / 状態保存

保存は `localStorage` を使用し、ページ再読込後も状態を復元します。

| Key | 内容 |
|-----|------|
| `pos` | ウィンドウ位置（x,y） |
| `opacity` | 透明度 |
| `dark` | テーマ状態 |
| `minimized` | コンパクトモード状態 |
| `hideGraph` | グラフ表示ON/OFF |

---

## 🧩 Installation / インストール方法

1. [**Tampermonkey**](https://www.tampermonkey.net/) をインストール  
2. 「新しいスクリプトを作成」 → 下記コードを貼り付け  
3. **保存して有効化**

または以下のリンクから直接インストール可能：

👉 [**Install web_task_manager.user.js**](https://raw.githubusercontent.com/O-TYAN64/web-task-manager/main/web-task-manager.user.js)

---

## ⚙️ Implementation Notes / 実装メモ

- グラフは `<canvas>` にて軽量描画（約30fps更新）  
- GPU名は自動検出・省略処理あり  
- テーマはOS / サイトのダークモードを自動検知  
- `localStorage` により状態完全復元  
- すべてのUI要素がリサイズ対応（UI自動調整機能）

---

## 🧑‍💻 Author / 作者

**O-TYAN64**  
[GitHub Profile](https://github.com/O-TYAN64)

---

## ⚖️ License

MIT License  
自由に改変・再配布可能です。クレジットの残存をお願いします。

---

<p align="center">
  <sub>© 2025 O-TYAN64 — Web Task Manager v11.0</sub>
</p>
