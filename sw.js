/* ?拐辣蝮質汗 ??Service Worker
   ?桃?:
   1) 霈?Chrome / Edge ?函雯???＊蝷箝?鋆?蝷?摰??內?閬?fetch ??撣詨?)??   2) 霈?App ?臭誑?Ｙ???(?～雯頝臬?蝺??敹怠?????蝺?銝敺??啁?,
      ?隞乩?銋?瘥活?函蔡?啁??賣?擐砌???,銝??∪??)??   瘜冽?:Google ?脩垢?郊蝑楊蝬脣?隢?銝敺漱蝯衣雯頝?銝??翰??*/

const CACHE = "property-app-shell-v20260724-ZP";
const SHELL = ["./", "./index.html", "./sw.js", "./icon-192.png", "./icon-180.png", "./icon-512.png"];
const OFFLINE_HTML = "<!DOCTYPE html><html lang=\"zh-Hant\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>?Ｙ?</title></head><body style=\"font-family:sans-serif;padding:2rem;text-align:center\"><h1>?桀??Ｙ?</h1><p>隢??蝬脰楝敺??圈????Ⅱ隤?冽迨鋆蔭????? App??/p></body></html>";

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

  // ?芾???皞?瘙?頝函雯??靘? Google API)鈭斤策?汗?函?仿?雯
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
