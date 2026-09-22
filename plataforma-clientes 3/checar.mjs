import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3100" + process.argv[2], { waitUntil: "networkidle" });
await p.waitForTimeout(600);
const r = await p.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.textContent.trim()).slice(0, 12), process.argv[3]);
console.log(JSON.stringify(r, null, 1));
await b.close();
