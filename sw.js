/* 物件總覽 2026.10.12D：成功載入完整新版後才啟用，離線保留正常頁面。 */
const VERSION="20261012D";
const SCOPE=new URL(self.registration.scope);
const PREFIX="property-app-shell:"+encodeURIComponent(SCOPE.pathname)+":";
const CACHE=PREFIX+VERSION;
const SHELL=["./","./index.html","./icon-180.png?v="+VERSION,"./icon-192.png?v="+VERSION,"./icon-512.png?v="+VERSION];
async function validShell(response,isPage){
 if(!response || !response.ok || response.type==="opaque" || response.type==="opaqueredirect")return false;
 if(response.url){const finalURL=new URL(response.url);if(finalURL.origin!==SCOPE.origin || !finalURL.pathname.startsWith(SCOPE.pathname))return false}
 const mime=(response.headers.get("Content-Type")||"").split(";")[0].trim().toLowerCase();
 if(!(isPage?["","text/html","application/xhtml+xml"]:["","image/png","image/x-png","application/octet-stream","binary/octet-stream"]).includes(mime))return false;
 const bytes=new Uint8Array(await response.clone().arrayBuffer());
 if(!isPage)return bytes.length>=8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 const html=new TextDecoder().decode(bytes);
 return /<title>\s*物件總覽\s*<\/title>/i.test(html) && /<div\b[^>]*\bid\s*=\s*["']app["']/i.test(html) &&
  /\bconst\s+APP_VERSION\s*=\s*["'][^"']+["']/.test(html) && html.includes("property_app_data_v4") && /<\/body\s*>/i.test(html) && /<\/html\s*>/i.test(html);
}
async function checkedFetch(req,isPage){
 const ctrl=new AbortController();let timer;
 try{
  return await Promise.race([
   (async()=>{const response=await fetch(req,{signal:ctrl.signal});return {response,valid:await validShell(response,isPage)}})(),
   new Promise((resolve,reject)=>{timer=setTimeout(()=>{ctrl.abort();reject(new Error("Shell request timed out"))},6000)})
  ]);
 }finally{clearTimeout(timer)}
}
async function cachedShell(cache,req,isPage){
 try{const response=await cache.match(req);return await validShell(response,isPage)?response:null}catch(err){return null}
}
self.addEventListener("install",e=>{
 e.waitUntil((async()=>{
  const ready=await Promise.all(SHELL.map(async (url,index)=>{
   const result=await checkedFetch(url,index<2);
   if(!result.valid)throw new Error("Invalid app shell: "+url);
   return {url,response:result.response};
  }));
  const cache=await caches.open(CACHE);
  await Promise.all(ready.map(item=>cache.put(item.url,item.response)));
  await self.skipWaiting();
 })());
});
self.addEventListener("activate",e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=="GET" || url.origin!==SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname))return;
 const isPage=req.mode==="navigate";
 const file=url.pathname.slice(SCOPE.pathname.length);
 if(!isPage && !["index.html","icon-180.png","icon-192.png","icon-512.png"].includes(file))return;
 const expectsPage=isPage || file==="index.html";
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  let response=null;
  try{
   const result=await checkedFetch(req,expectsPage);response=result.response;
   if(result.valid){
    const copy=response.clone();
    e.waitUntil(cache.put(req,copy).catch(()=>{}));
    return response;
   }
  }catch(err){}
  const hit=await cachedShell(cache,req,expectsPage);
  if(hit)return hit;
  if(isPage){
   const page=await cachedShell(cache,"./index.html",true);
   if(page)return page;
  }
  if(response && !response.ok && response.type!=="opaque" && response.type!=="opaqueredirect")return response;
  return new Response(isPage?"目前無法連線，請連上網路後重新開啟物件總覽。":"Resource unavailable",
   {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
 })());
});
