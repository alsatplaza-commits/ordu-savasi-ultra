/* ORDU SAVAŞI: KOMUTA — kayıt: IndexedDB + localStorage yedeği + JSON dosyası indir/yükle */
var SAVE_DB='ordu-savasi-ultra', SAVE_KEY='oyun', SAVE_ID='ordu-savasi-ultra-1';
function b64enc(u8){ var s='', CH=0x8000; for (var i=0;i<u8.length;i+=CH) s+=String.fromCharCode.apply(null, u8.subarray(i,i+CH)); return btoa(s); }
function b64dec(s){ var b=atob(s), u=new Uint8Array(b.length); for (var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
function serialize(){
  var ents=G.ents.map(function(e){ var o={}; for (var k in e){ if (k==='path'||k==='_q'||k==='dead') continue; o[k]=e[k]; } return o; });
  return { oyun:SAVE_ID, surum:1, tarih:new Date().toISOString(), seed:G.seed, N:G.N, diff:G.diff, t:G.t, f:G.f, day:G.day, season:G.season, year:G.year, endless:G.endless,
    nid:G.nid, teams:G.teams, ai:G.ai, towns:G.towns, horde:G.horde, nextMeteor:G.nextMeteor, meteors:G.meteors, mines:G.mines, loot:G.loot, rngS:G.rngS, decoCut:G.decoCut||{},
    cry:b64enc(MAP.cry), ore:b64enc(MAP.ore), deco:b64enc(MAP.deco), terr:b64enc(MAP.terr), explored:b64enc(G.explored), ents:ents, over:G.over,
    cam:{x:CAM.x,y:CAM.y,z:CAM.z} };
}
function deserialize(o){
  if (!o || o.oyun!==SAVE_ID) throw new Error('Geçersiz kayıt');
  N=o.N; MAP=genMap(o.seed);
  MAP.cry=b64dec(o.cry); MAP.ore=b64dec(o.ore); MAP.deco=b64dec(o.deco); if (o.terr) MAP.terr=b64dec(o.terr);
  G={ v:1, seed:o.seed, N:o.N, diff:o.diff, t:o.t, f:o.f||0, day:o.day, season:o.season, year:o.year, endless:o.endless, occ:new Int32Array(N*N), ents:[], map:{}, nid:o.nid, proj:[], mines:o.mines||[], meteors:o.meteors||[], falls:[], strikes:[],
      loot:o.loot, teams:o.teams, ai:o.ai, over:o.over, towns:o.towns, rngS:o.rngS, horde:o.horde, nextMeteor:o.nextMeteor, explored:b64dec(o.explored), vis:new Uint8Array(N*N), stats:{start:Date.now()}, decoCut:o.decoCut };
  o.ents.forEach(function(e){ G.ents.push(e); G.map[e.id]=e; if (e.k==='b'){ var d=BLD[e.type]; for (var y=e.ty;y<e.ty+d.h;y++) for (var x=e.tx;x<e.tx+d.w;x++) G.occ[idx(x,y)]=e.id; } });
  recalcTeam(0); recalcTeam(1);
  if (o.cam){ CAM.x=o.cam.x; CAM.y=o.cam.y; CAM.z=o.cam.z; }
  FX.parts.length=0; FX.decals.length=0; FX.beams.length=0;
}
function idb(){ return new Promise(function(r){ try{ var q=indexedDB.open(SAVE_DB,1); q.onupgradeneeded=function(){ q.result.createObjectStore('kv'); }; q.onsuccess=function(){ r(q.result); }; q.onerror=q.onblocked=function(){ r(null); }; }catch(e){ r(null); } }); }
function idbGet(k){ return idb().then(function(d){ return new Promise(function(r){ if(!d) return r(undefined); try{ var g=d.transaction('kv','readonly').objectStore('kv').get(k); g.onsuccess=function(){ r(g.result); }; g.onerror=function(){ r(undefined); }; }catch(e){ r(undefined); } }); }); }
function idbPut(k,v){ return idb().then(function(d){ return new Promise(function(r){ if(!d) return r(false); try{ var t=d.transaction('kv','readwrite'); t.objectStore('kv').put(v,k); t.oncomplete=function(){ r(true); }; t.onerror=function(){ r(false); }; }catch(e){ r(false); } }); }); }
function idbClear(){ return idb().then(function(d){ return new Promise(function(r){ if(!d) return r(); try{ var t=d.transaction('kv','readwrite'); t.objectStore('kv').clear(); t.oncomplete=r; t.onerror=r; }catch(e){ r(); } }); }); }
function saveGame(silent){
  if (!G || G.over==='lose') return Promise.resolve(false);
  var s=JSON.stringify(serialize());
  try { localStorage.setItem(SAVE_DB+':'+SAVE_KEY, s); } catch(e){ /* localStorage dolu olabilir: IndexedDB yeter */ }
  return idbPut(SAVE_KEY, s).then(function(ok){ if (!silent) uiMsg(ok?'💾 Oyun kaydedildi':'💾 Kaydedildi (yedek)','good'); return true; });
}
function loadSaved(){
  return idbGet(SAVE_KEY).then(function(s){ if (!s){ try{ s=localStorage.getItem(SAVE_DB+':'+SAVE_KEY); }catch(e){} } return s ? JSON.parse(s) : null; });
}
function exportSave(){
  var o=serialize(), name='ordu-savasi-kayit-gun'+G.day+'-'+o.tarih.slice(0,10)+'.json';
  if (window.OrduYerel && OrduYerel.saveText){ var r=OrduYerel.saveText(name, JSON.stringify(o)); uiMsg(r==='ok'?'Kayıt İndirilenler/OrduSavasi klasörüne yazıldı':'Kayıt yazılamadı', r==='ok'?'good':'bad'); return; }
  var b=new Blob([JSON.stringify(o)],{type:'application/json'}), a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download='ordu-savasi-kayit-gun'+G.day+'-'+o.tarih.slice(0,10)+'.json'; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}
function importSave(cb){
  var f=document.createElement('input'); f.type='file'; f.accept='.json,application/json';
  f.onchange=function(){ var x=f.files&&f.files[0]; if(!x) return; var rd=new FileReader(); rd.onload=function(){ try{ var o=JSON.parse(rd.result); deserialize(o); saveGame(true); cb&&cb(true); }catch(e){ alert('Bu dosya geçerli bir Ordu Savaşı kaydı değil.'); cb&&cb(false); } }; rd.readAsText(x); };
  f.click();
}
function wipeAllData(){ try{ Object.keys(localStorage).forEach(function(k){ if (k.indexOf(SAVE_DB)===0) localStorage.removeItem(k); }); }catch(e){} return idbClear().then(function(){ if (window.caches) return caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); }); }); }
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}
