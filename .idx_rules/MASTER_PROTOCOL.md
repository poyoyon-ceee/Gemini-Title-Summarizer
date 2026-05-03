# MASTER PROTOCOL

## プロジェクト概要
GeminiのUIを拡張し、チャットタイトルの編集を自動化する。

## 開発ルール
- 成果物は `dist/` に集約する。
- GeminiのDOM要素は難読化されているため、テキスト内容（「名前を変更」など）を基準に要素を特定する。
- SPAの内部状態更新を妨げないよう、`Native Setter` と `InputEvent` の dispatch を徹底する。

## ワークフロー
- `content.js` の修正時は、手動で拡張機能をリロードして確認する。
