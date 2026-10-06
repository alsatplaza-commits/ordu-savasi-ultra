/* ORDU SAVAŞI: KOMUTA — imzalı içerik paketleri.
   Kurallar: tek izinli adres (PACK_ORIGIN), ECDSA P-256 imzalı manifest, her dosya için SHA-256 kontrolü.
   Paketler SADECE veri içerir (ses/müzik/doku). Paketlerden asla kod çalıştırılmaz. */
var PACK_ORIGIN = 'https://alsatplaza-commits.github.io/ordu-savasi-ultra/packs/';
var PACK_PUBKEY = {"kty":"EC","x":"-cqWKFbEQM52iK7-ArwGnJFqekW-U2q6pnTJV9sEIcg","y":"ktqm9XYlKXlk28C3Bl2GwMbvu8RArgR0PyGnpccHDQk","crv":"P-256"};
var PACK_CACHE = 'ordu-paket-v1';
var PACK_ALLOWED_EXT = /\.(ogg|png|webp|json)$/i;
var PACKS = (function(){
  var state={installed:{}, busy:false};
  try { state.installed = JSON.parse(localStorage.getItem('ordu-savasi-ultra:paketler')||'{}'); } catch(e){}
  function saveState(){ try { localStorage.setItem('ordu-savasi-ultra:paketler', JSON.stringify(state.installed)); } catch(e){} }
  function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); }
  function b64(s){ var b=atob(s), u=new Uint8Array(b.length); for (var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
  function safeUrl(name, file){
    if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error('Geçersiz paket adı');
    if (!/^[a-z0-9_\/-]+\.[a-z0-9]+$/i.test(file) || file.indexOf('..')>=0 || !PACK_ALLOWED_EXT.test(file)) throw new Error('İzin verilmeyen dosya: '+file);
    var u = new URL(name+'/'+file, PACK_ORIGIN);
    if (u.href.indexOf(PACK_ORIGIN)!==0) throw new Error('İzin verilmeyen adres');
    return u.href;
  }
  async function verifyManifest(m){
    if (!m || typeof m.body!=='string' || typeof m.sig!=='string') throw new Error('Manifest bozuk');
    var key = await crypto.subtle.importKey('jwk', PACK_PUBKEY, {name:'ECDSA', namedCurve:'P-256'}, false, ['verify']);
    var ok = await crypto.subtle.verify({name:'ECDSA', hash:'SHA-256'}, key, b64(m.sig), new TextEncoder().encode(m.body));
    if (!ok) throw new Error('İmza geçersiz! Paket reddedildi.');
    return JSON.parse(m.body);
  }
  async function install(name, onProg){
    if (state.busy) throw new Error('Zaten indiriliyor'); state.busy=true;
    try {
      if (!window.caches || !crypto.subtle) throw new Error('Bu cihaz paket indirmeyi desteklemiyor');
      var mres = await fetch(safeUrl(name,'manifest.json'), {cache:'no-store', credentials:'omit', redirect:'error'});
      if (!mres.ok) throw new Error('Paket bulunamadı ('+mres.status+')');
      var raw = await mres.json(), man = await verifyManifest(raw);
      if (man.pack!==name) throw new Error('Paket adı uyuşmuyor');
      var cache = await caches.open(PACK_CACHE), total=man.files.reduce(function(a,f){return a+f.s;},0), done=0;
      for (var i=0;i<man.files.length;i++){
        var f=man.files[i], url=safeUrl(name,f.p);
        var have = await cache.match(url);
        if (have){ var hb=await have.clone().arrayBuffer(); if (hex(await crypto.subtle.digest('SHA-256', hb))===f.h){ done+=f.s; onProg&&onProg(done/total, f.p); continue; } }
        var r = await fetch(url, {cache:'no-store', credentials:'omit', redirect:'error'}); if (!r.ok) throw new Error('İndirilemedi: '+f.p);
        var buf = await r.arrayBuffer();
        if (buf.byteLength!==f.s || hex(await crypto.subtle.digest('SHA-256', buf))!==f.h) throw new Error('SHA-256 uyuşmadı: '+f.p+' (dosya reddedildi)');
        await cache.put(url, new Response(buf, {headers:{'content-type': /\.ogg$/.test(f.p)?'audio/ogg':'application/octet-stream'}}));
        done+=f.s; onProg&&onProg(done/total, f.p);
      }
      state.installed[name]={version:man.version, files:man.files.map(function(f){return f.p;}), size:total, hashes:man.files.reduce(function(o,f){o[f.p]=f.h;return o;},{})}; saveState();
      return man;
    } finally { state.busy=false; }
  }
  async function get(name, file){
    if (!state.installed[name] || !window.caches) return null;
    var url=safeUrl(name,file), cache=await caches.open(PACK_CACHE), r=await cache.match(url); if (!r) return null;
    var buf=await r.arrayBuffer(), want=state.installed[name].hashes&&state.installed[name].hashes[file];
    if (want && hex(await crypto.subtle.digest('SHA-256', buf))!==want) return null; // bozulmuş dosyayı kullanma
    return buf;
  }
  async function remove(name){ if (!window.caches) return; var cache=await caches.open(PACK_CACHE), inst=state.installed[name]; if (inst) for (var i=0;i<inst.files.length;i++) await cache.delete(safeUrl(name,inst.files[i])); delete state.installed[name]; saveState(); }
  function has(name){ return !!state.installed[name]; }
  function status(){ var n=Object.keys(state.installed); return n.length ? 'Yüklü paketler: '+n.map(function(k){ return k+' v'+state.installed[k].version+' ('+Math.round(state.installed[k].size/1048576)+' MB)'; }).join(', ') : 'Ek içerik paketi yüklü değil (⚙ Ayarlar → İçerik paketleri)'; }
  return {install:install, get:get, remove:remove, has:has, status:status};
})();
