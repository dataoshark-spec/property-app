/* 客戶總覽：只維護自己作用範圍內的成功快取。 */
const SCOPE=self.registration.scope;
const PREFIX="customer-shell:"+SCOPE+":";
const CACHE=PREFIX+"20261111B";
const SHELL=["./","./index.html","./icon-192.png","./icon-180.png","./icon-512.png"];
const ASSETS=new Set(SHELL.map(x=>new URL(x,SCOPE).href));
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(x=>new Request(new URL(x,SCOPE).href,{cache:"reload"})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  // Version and launch parameters share the same scoped offline asset.
  url.search="";
  if(!ASSETS.has(url.href))return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const res=await fetch(req);
      if(res.ok&&res.type!=="opaque"){
        // Keep one version of the application shell together. Upgrade via SW install.
        return res;
      }
      const hit=await cache.match(url.href);if(hit)return hit;
      return res;
    }catch(err){
      const hit=await cache.match(url.href);if(hit)return hit;
      if(req.mode==="navigate"){
        const page=await cache.match(new URL("./index.html",SCOPE).href);
        if(page)return page;
        return new Response("<!doctype html><meta charset=utf-8><title>離線</title><p>目前離線，請連線後重新開啟客戶總覽。</p>",{status:503,headers:{"Content-Type":"text/html; charset=utf-8"}});
      }
      return new Response("Offline",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});
