/* 物件總覽 — Service Worker
   用途:
   1) 讓 Chrome / Edge 願意顯示「安裝」提示(PWA 必須註冊 fetch 事件)。
   2) 讓 App 可以離線開啟(網路優先,失敗才回快取;先取新版、拿不到才用舊版)。
   注意:Google 雲端同步等跨網域請求一律直接走網路,不攔截、不快取。
*/

const CACHE = "property-app-shell-v20260828-A";
const SHELL = ["./", "./index.html", "./sw.js", "./icon-192.png", "./icon-180.png", "./icon-512.png"];
const OFFLINE_HTML = "<!DOCTYPE html><html lang=\"zh-Hant\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>目前離線</title></head><body style=\"font-family:sans-serif;padding:2rem;text-align:center\"><h1>目前離線</h1><p>請連上網路後重新整理，或改用已安裝在本機的 App。</p></body></html>";

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

  // 跨網域請求(例如 Google 雲端 API)不攔截、不快取,直接走網路
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
