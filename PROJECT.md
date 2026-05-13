# Gemini Title Summarizer

Geminiのチャット履歴に「動画要約に分類」メニューを追加し、タイトルに「要約：」を自動挿入するChrome拡張機能。

## 構成
- `dist/`: Chrome読み込み用ディレクトリ
  - `manifest.json`: 拡張機能の設定
  - `content.js`: メインロジック（DOM監視・操作）
  - `icon.png`: 拡張機能アイコン

## 使い方
1. Chromeの拡張機能管理画面 (`chrome://extensions/`) を開く。
2. 「デベロッパー モード」をONにする。
3. 「パッケージ化されていない拡張機能を読み込む」を選択し、このプロジェクトの `dist` フォルダを選択する。
4. Geminiのチャット画面で、サイドバーの履歴メニュー（︙）をクリックすると「動画要約に分類」が表示される。

## 技術スタック
- JavaScript (Vanilla)
- Chrome Extension Manifest V3
- MutationObserver
