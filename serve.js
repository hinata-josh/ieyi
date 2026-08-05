// 小型靜態伺服器：讓同一個 WiFi 下的手機 / 平板也能打開這個參賽網站
// 用法：bun.exe serve.js   (由「手機連線.bat」自動帶起)
import { networkInterfaces } from "os";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";

const PORT = 8102;
const DIR = import.meta.dir;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

function lanIPs() {
  const out = [];
  const ifs = networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const i of ifs[name] || []) {
      if (i.family === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  return out;
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req) {
    let p = new URL(req.url).pathname;
    if (p === "/") p = "/JoshIEYI.html";
    const file = join(DIR, decodeURIComponent(p));
    if (!file.startsWith(DIR) || !existsSync(file)) return new Response("404", { status: 404 });
    return new Response(readFileSync(file), {
      headers: { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream" }
    });
  },
});

console.log("\n  ==================================================");
console.log("   「踩亮生路」IEYI 參賽網站 · 伺服器已啟動");
console.log("  ==================================================\n");
console.log("   這台電腦看：  http://localhost:" + PORT + "\n");
console.log("   （互動操作版：後面加 /JoshIEYI-judge.html）\n");
const ips = lanIPs();
if (ips.length) {
  console.log("   手機 / 平板（同一個 WiFi）開瀏覽器輸入：\n");
  for (const ip of ips) {
    console.log("        團隊版　　http://" + ip + ":" + PORT);
    console.log("        互動操作版 http://" + ip + ":" + PORT + "/JoshIEYI-judge.html\n");
  }
} else {
  console.log("   （找不到區網 IP，請確認已連上 WiFi）\n");
}
console.log("  --------------------------------------------------");
console.log("   保持這個視窗開著。看完關閉視窗即可。");
console.log("  ==================================================\n");
