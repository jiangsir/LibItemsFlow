const https = require("https");

const baseUrlRaw = process.env.GAS_WEBAPP_URL;

if (!baseUrlRaw) {
  console.error("請先設定 GAS_WEBAPP_URL，例如：");
  console.error("  set GAS_WEBAPP_URL=https://script.google.com/macros/s/xxx/exec");
  process.exit(1);
}

const baseUrl = baseUrlRaw.trim();
const url = `${baseUrl.replace(/\/$/, "")}/health`;

function request(urlToFetch, redirectCount = 0) {
  if (redirectCount > 5) {
    console.error("Too many redirects");
    process.exit(1);
  }

  https
    .get(urlToFetch, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = res.headers.location;
          console.log(`Redirect ${res.statusCode} -> ${nextUrl}`);
          return request(nextUrl, redirectCount + 1);
        }

        console.log("Status:", res.statusCode);
        console.log("Body:", data);
        if (res.statusCode === 302 || data.includes("ServiceLogin")) {
          console.log("提示：若看到 Google 登入頁，請將 Web App 存取權設為『任何人』或『任何具備連結者』。");
        }
      });
    })
    .on("error", (err) => {
      console.error("Request failed:", err.message);
      process.exit(1);
    });
}

request(url);
