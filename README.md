# 隨機經文 + 名人語錄（同機固定）

此專案提供一個可由 QR Code 開啟的網頁：
- 第一次在手機開啟時，會依該手機產生「穩定裝置鍵」並挑選「一組經文＋語錄」。
- 同一支手機每次掃描都顯示相同內容（除非清除瀏覽器資料或使用無痕模式）。
- 不同手機會得到不同的組合。

## 目前的唯一資料來源
- 顯示內容「只」取自根目錄的 `merged_verses_quotes.txt`。
- 檔案格式為「每 4 行一組」：
  1) 經文參考（ref）
  2) 經文內容（verse）
  3) 語錄作者（author）
  4) 語錄內容（quote；原始資料若以全形引號包住，前端會自動去除開頭/結尾的全形引號）

注意：過去的 `external-verses.json` 與 `quotes.json` 已移除且不再使用。

## 檔案結構（精簡）
- `index.html`：大螢幕入口頁（顯示 QR 與連動控制）。
- `view.html`：手機端顯示頁面（載入 `scripts/app.js`）。
- `scripts/app.js`：前端邏輯（裝置鍵、決定性選取、讀取 `merged_verses_quotes.txt` 並解析渲染）。
- `qrcode.html`：產生指向 `view.html` 或 `quiz.html` 的 QR（可列印）。
- `merged_verses_quotes.txt`：124 組經文＋語錄的來源檔。

## 本機預覽
以檔案方式開啟可正常顯示（已改為讀取純文字）。若你要以伺服器預覽：

```powershell
# 進入專案資料夾
cd "d:\Documents\Projects\VS code\Random Scripture"
# 啟動本機伺服器（http://localhost:8000）
python -m http.server 8000
```

在手機開啟 `index.html` 的 QR 後，會進入 `view.html` 顯示當前裝置綁定的一組內容。

## 決定性（同機固定）的做法（維持不變）
- 以多項瀏覽器與裝置特徵（UA、語言、平台、螢幕、時區、Canvas/WebGL 指紋…）計算指紋並存入 `localStorage`。
- 用裝置鍵（或一致性代碼）+ 重置鹽值，雜湊對 `merged_verses_quotes.txt` 的組數取模，決定挑選哪一組。

### 跨瀏覽器的一致性代碼（選用）
- 在 `view.html` 可呼叫瀏覽器提示設定一致性代碼（或在網址帶 `?code=` / `?bind=`）。
- 同一台裝置不同瀏覽器輸入相同碼後，顯示結果會一致。

## 產生與列印 QR Code
- 開啟 `qrcode.html`，選擇要導向 `view.html`（文）或 `quiz.html`（題）。
- 若部署到網域，將目標網址改成線上網址再列印。

## 清理與差異
- 舊版提到的 `external-verses.json`、`quotes.json` 已移除。
- `import.html` 仍保留作為語錄轉檔的小工具，但目前主流程不使用該輸出檔。

## 常見問題
- 手機掃不到本機網址？請確保手機與電腦在同一網路，並使用可被手機存取的 LAN IP 或已部署的網域。`qrcode.html` 支援自訂目標網址。
