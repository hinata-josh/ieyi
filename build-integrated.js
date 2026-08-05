/* =====================================================================
   build-integrated.js
   把「麵包板模擬器」(K:\Html5\breadboard-sim) 內嵌進參賽網站的
   「互動原理模擬實驗室」，輸出成另一個單一 HTML 檔。

   用法：node build-integrated.js
   輸入：JoshIEYI.html
        ../breadboard-sim/breadboard.html + circuit.js + app.js
   輸出：JoshIEYI-lab.html   （單一檔案、零外部相依、可離線／可拖 Netlify）

   做法說明（為什麼不是直接把 HTML 貼進去）：
   麵包板模擬器有自己的 body/button/main 等「裸標籤」CSS，還有 roCap、
   roPeak 這些跟參賽網站同名的 id。直接合併會互相破壞版面與 DOM 查詢，
   所以改成把整份麵包板 HTML 放進 <script type="text/plain" id="bbSrc">，
   由參賽網站在執行時灌進 iframe.srcdoc —— 兩邊的 CSS / id / 事件完全隔離。

   內嵌時所有 <script 與 </script 都換成標記字串（否則 HTML parser 會在
   payload 中間就把外層 <script> 結束掉），由頁面端還原。
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const BB = path.join(DIR, '..', 'breadboard-sim');
const SRC = path.join(DIR, 'JoshIEYI.html');
/* 檔名刻意用純 ASCII：.bat 啟動器裡出現中文檔名時，cmd 會用 Big5 解讀 UTF-8 位元組而找不到檔案 */
const OUT = path.join(DIR, 'JoshIEYI-judge.html');

/* ---------- 1. 組出「單一檔案版」的麵包板模擬器 ---------- */
let bb = fs.readFileSync(path.join(BB, 'breadboard.html'), 'utf8');
['circuit.js', 'app.js'].forEach(function (f) {
  const tag = '<script src="' + f + '"></script>';
  if (bb.indexOf(tag) < 0) throw new Error('breadboard.html 裡找不到 ' + tag + '（外部檔引用方式改了？）');
  bb = bb.replace(tag, '<script>\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(BB, f), 'utf8') + '\n</script>');
});

/* 嵌在參賽網站裡的版面覆寫：改成「麵包板在上、面板在下」的單欄流，
   讓 iframe 不需要內層水平捲軸；並回報高度給父頁面自動撐高。 */
const PATCH = `
<style>
/* ==== 由 build-integrated.js 加入：內嵌於參賽網站時的版面覆寫 ==== */
html, body { overflow-x: hidden; }
/* 外層參賽網站已經有一條標題列了，這裡只留操作按鈕，不要重複標題 */
header > div:first-child { display: none; }
header { position: sticky; top: 0; z-index: 5; padding: 8px 12px; }
main { display: flex !important; flex-direction: column; padding: 10px; }
section.center { order: 1; }
aside.left { order: 2; }
aside.right { order: 3; }
aside.left, aside.right {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
  gap: 11px; align-items: start;
}
aside.left .card, aside.right .card { margin-bottom: 0; }
.part { display: inline-flex; width: auto; margin-right: 6px; }
</style>
<script>
/* 把自己的高度回報給父頁面，讓 iframe 自動撐高（避免出現內層捲軸） */
(function () {
  function send() {
    try { parent.postMessage({ __bb: 1, h: document.documentElement.scrollHeight + 2 }, '*'); } catch (e) {}
  }
  window.addEventListener('load', send);
  setInterval(send, 700);
  send();
})();
</script>
`;
bb = bb.replace('</body>', PATCH + '</body>');
bb = bb.replace('<head>', '<head>\n<!-- 由 build-integrated.js 內嵌：原始檔在 K:\\Html5\\breadboard-sim -->');

/* ---------- 2. 標記化，讓它能安全塞進 <script type="text/plain"> ---------- */
const payload = bb.replace(/<\/script/gi, '@@ENDSCRIPT@@').replace(/<script/gi, '@@SCRIPT@@');
if (/<\/?script/i.test(payload)) throw new Error('標記化失敗：payload 裡還有 script 標籤');

/* ---------- 3. 注入參賽網站 ---------- */
let html = fs.readFileSync(SRC, 'utf8');
if (html.indexOf('id="bbSrc"') >= 0) throw new Error('JoshIEYI.html 裡已經有 bbSrc（是不是拿整合版當輸入了？）');
if (html.indexOf('secBreadboard') < 0) throw new Error('JoshIEYI.html 裡找不到 secBreadboard()（頁面端的接線程式被移除了？）');

/* 一定要插在主程式 <script> 之前：secBreadboard() 在渲染時會用
   document.getElementById('bbSrc') 判斷「有沒有內嵌模擬器」，
   放在主程式之後的話那時候還不存在，整段就不會出現。 */
const at = html.lastIndexOf('<script>');
if (at < 0) throw new Error('JoshIEYI.html 裡找不到主程式 <script>');

const block =
  '<!-- ============================================================\n' +
  '     麵包板模擬器原始碼（單一檔案版），由 build-integrated.js 內嵌。\n' +
  '     頁面端 initBreadboard() 會把它還原後灌進 iframe.srcdoc。\n' +
  '     要修改模擬器請改 K:\\Html5\\breadboard-sim 下的原始檔後重新產生。\n' +
  '     ============================================================ -->\n' +
  '<script type="text/plain" id="bbSrc">' + payload + '</script>\n';

html = html.slice(0, at) + block + html.slice(at);

/* ---------- 4. 切成「評審操作版」 ---------- */
const HTMLTAG = '<html lang="zh-Hant" data-lang="zh" data-theme="dark">';
if (html.indexOf(HTMLTAG) < 0) throw new Error('找不到 <html> 標籤（屬性被改過？）');
html = html.replace(HTMLTAG, '<html lang="zh-Hant" data-lang="zh" data-theme="dark" data-judge="1">');

html = html.replace('<title>', '<title>【評審操作版】');
html = html.replace('<small>災害管理與安全 · IEYI 世界青少年創客發明展 · Hinata Team</small>',
  '<small>評審操作版 · 災害管理與安全 · IEYI · Hinata Team</small>');

html = html.replace('<!doctype html>',
  '<!doctype html>\n<!-- 【評審操作版】本檔＝JoshIEYI.html ＋ 內嵌麵包板模擬器，並以 data-judge="1" 切成\n' +
  '     給評審動手操作的版本（多了操作指引、預先鋪上標示清楚的示範數據、拿掉製作團隊的待辦與參賽檢查清單）。\n' +
  '     由 build-integrated.js 自動產生，請勿手改；要改內容請改 JoshIEYI.html 後重新產生。\n' +
  '     想在這個檔案上看製作團隊版，網址後面加 ?judge=0 即可。 -->');

fs.writeFileSync(OUT, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
const left = html.match(/<script src="[^"]+"/g);
console.log('已產生 ' + OUT + '（' + kb + ' KB）');
console.log('  · 內嵌麵包板模擬器：' + (Buffer.byteLength(bb, 'utf8') / 1024).toFixed(0) + ' KB');
console.log('  · 外部相依：' + (left ? '⚠️ 還有 ' + left.join(', ') : '無（完全自足，可離線）'));
