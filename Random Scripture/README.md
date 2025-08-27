# 隨機經文 + 名人語錄（同機固定）

此專案提供一個可由 QR Code 開啟的網頁：
- 第一次在手機開啟時，會依據該手機產生「穩定裝置鍵」並挑選一條經文與一條名人語錄。
- 同一支手機每次掃描都顯示相同內容（除非清除瀏覽器資料或使用無痕模式）。
- 不同手機會得到不同的組合。

## 檔案結構
- `index.html`：主頁，顯示經文與語錄。
- `qrcode.html`：產生指向 `index.html` 的 QR Code，支援自訂目標網址（方便部署到網域）。
- `scripts/app.js`：前端邏輯（裝置鍵、決定性選取、資料載入）。
- `external-verses.json`：經文資料（已存在）。
- `quotes.json`：名人語錄資料（先放少量範例）。

## 放入你的 300 條資料
- 經文庫：請維持 `external-verses.json` 的格式（陣列，每筆含 `book`, `chapter`, `verse`, `version`，可選 `rarity`）。
- 名人語錄庫：請準備 `quotes.json`，格式如下：

```json
[
  { "text": "語錄內容 1", "author": "作者 A" },
  { "text": "語錄內容 2", "author": "作者 B" }
]
```

將你的 300 條資料覆蓋到 `quotes.json`（與 `external-verses.json` 一樣位於專案根目錄）。

## 本機預覽
若你只是直接以檔案方式（file://）開啟 `index.html`，Chrome 可能因 CORS 限制而無法載入 JSON。建議使用簡單的本機伺服器。

Windows PowerShell 可用 Python 內建伺服器（需安裝 Python）：

```powershell
# 進入專案資料夾
cd "d:\Documents\Projects\VS code\Random Scripture"
# 啟動本機伺服器（http://localhost:8000）
python -m http.server 8000
```

開啟瀏覽器造訪：`http://localhost:8000/index.html`

## 產生與列印 QR Code
- 開啟 `http://localhost:8000/qrcode.html`
- 若你已部署到網域，將目標網址改為你的線上網址（例如 `https://yourdomain/Random%20Scripture/index.html`），按「更新 QR」，再按「列印」。

## 決定性（同機固定）的做法
- 預設會以多項瀏覽器與裝置特徵（UA、語言、平台、螢幕、時區、Canvas/WebGL 指紋…）計算指紋並存入 `localStorage`，提升跨瀏覽器的一致性。
- 以該裝置鍵 + 鹽值（verse/quote）雜湊，對資料長度取模，決定挑選的索引。
- 經文支援 `rarity` 權重，常見程度越高被抽中的機率越大；但對同一手機仍是固定結果。

### 跨瀏覽器一致的「一致性代碼」
- 在首頁按「設定一致性代碼」，輸入任意字串（例如教會分發碼、家庭碼、或你在後台分配的碼）。同一台裝置的不同瀏覽器只要輸入相同碼，展示結果就會一致。
- 也可在網址上帶 `?code=你的碼` 或 `?bind=你的碼` 自動綁定。
- 清除或變更一致性代碼會改變結果。

## 部署建議
- 可上傳到任何靜態主機（GitHub Pages、Netlify、Vercel、S3/CloudFront 等）。
- 開 `qrcode.html` 設定目標網址為你的正式網址（或直接用 `?code=xxx` 預先綁定），再列印。
- 線上測試：用兩個不同手機掃描應得到不同組合；同一手機不同瀏覽器可先輸入同一一致性代碼以驗證一致。

## 常見問題
- 手機掃不到本機網址？請確保手機與電腦在同一網路，並使用可被手機存取的 LAN IP 或已部署到網域。`qrcode.html` 支援自訂目標網址。
- JSON 太大？瀏覽器仍可處理，但若超過數 MB，首次載入會較慢；可考慮只挑選 300 條供展示使用。
