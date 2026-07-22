/* 物件總覽 — Service Worker
   目的:
   1) 讓 Chrome / Edge 在網址列自動顯示「安裝」圖示(安裝提示需要 fetch 處理常式)。
   2) 讓 App 可以離線開啟(採「網路優先、離線回退快取」策略,線上一律拿最新版,
      所以你之後每次部署新版都會馬上生效,不會卡在舊版)。
   注意:Google 雲端同步等跨網域請求一律交給網路,不經過快取。 */

const CACHE = "property-app-shell-v20260722-fix13";
const SHELL = ["./", "./index.html", "./sw.js", "./icon-192.png", "./icon-180.png", "./icon-512.png"];
const OFFLINE_HTML = "<!DOCTYPE html><html lang=\"zh-Hant\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>離線</title></head><body style=\"font-family:sans-serif;padding:2rem;text-align:center\"><h1>目前離線</h1><p>請連上網路後重新開啟，或確認曾在此裝置成功開啟過本 App。</p></body></html>";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function () {});
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // 只處理同源請求;跨網域(例如 Google API)交給瀏覽器直接連網
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          return caches.match("./index.html").then(function (h2) {
            if (h2) return h2;
            return new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
          });
        });
      })
  );
});
