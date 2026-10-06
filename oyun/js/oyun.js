/* ORDU SAVAŞI: KOMUTA — simülasyon çekirdeği (fizik, savaş, ekonomi, gün/gece, mevsim, meteor) */
var DT = 1/30;
var FX = { parts:[], beams:[], decals:[], texts:[], shake:0 };   // görsel efektler (kaydedilmez)
var HOOK = { msg:function(){}, sound:function(){}, over:function(){}, chunkDirty:function(){} };
var ME = 0; // oyuncu takımı

function isEnemy(a,b){ return a!==b && a!==2 && b!==2; }
function defOf(e){ return e.k==='u' ? UNT[e.type] : BLD[e.type]; }
function byId(id){ return id ? G.map[id] : null; }
function teamOf(t){ return G.teams[t]; }
function newTeam(i){
  return {cr: i<2?5000:0, cap:4000, pw:0, pu:0, up:{}, q:{bina:[],savunma:[],piyade:[],arac:[],hava:[],destek:[]},
    ready:{bina:null,savunma:null}, sw:0, mat:{odun:0,tas:0,demir:0,bakir:0,altin:0,zenit:0}, items:{medkit:0,mine:0,cpu:0},
    soc:newSociety(), sci:0, disc:{}, alert:null, counts:{}, lost:0, killed:0, lowPowerWarn:0, fullWarn:0};
}

function newGame(opt){
  opt = opt||{};
  N = opt.size || 224;
  var seed = opt.seed || (Math.random()*1e9)|0;
  MAP = genMap(seed);
  G = { v:1, seed:seed, N:N, diff:opt.diff==null?1:opt.diff, t:DAY_LEN*0.06, day:1, season:0, year:1, endless:false,
        occ:new Int32Array(N*N), ents:[], map:{}, nid:1, proj:[], mines:[], meteors:[], falls:[], strikes:[],
        loot:MAP.loot, teams:[newTeam(0),newTeam(1),newTeam(2),newTeam(3)], ai:{}, over:null,
        towns:MAP.towns.map(function(tw,i){ return {x:tw.x, y:tw.y, r:tw.r, ad:TOWN_NAMES[i]||('Kasaba '+(i+1)), pop:800+((seed>>i)&7)*300, loy:[40,40]}; }),
        rngS: seed^0x5bd1e995, horde:{next:0, active:false, blood:false}, nextMeteor: DAY_LEN*1.4, explored:new Uint8Array(N*N), vis:new Uint8Array(N*N),
        stats:{start:Date.now()}, sick:{} };
  // Üsler
  for (var t=0;t<2;t++){
    var b=BASES[t];
    placeBuilding('yard', t, b.x-2, b.y-2, true);
    var sx=(b.x+ (t===0?4:-4))*T, sy=(b.y+(t===0?-4:4))*T;
    var start=['tank','tank','jeep','rifle','rifle','rifle','rifle','rocket','rocket','worker','worker','agent'];
    start.forEach(function(ty,i){ var a=i*0.55, rr=40+i*6; spawnUnit(ty, t, sx+Math.cos(a)*rr, sy+Math.sin(a)*rr); });
  }
  MAP.derricks.forEach(function(d){ placeBuilding('derrick', 2, d.x, d.y, true); });
  G.ai[1] = aiNew(1);
  revealAround(BASES[0].x, BASES[0].y, 18);
  return G;
}
function R(){ var a=G.rngS|0; a=a+0x6D2B79F5|0; G.rngS=a; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }
function revealAround(cx,cy,r){ for(var y=cy-r;y<=cy+r;y++)for(var x=cx-r;x<=cx+r;x++){ if(inMap(x,y)&&dist(x,y,cx,cy)<=r) G.explored[idx(x,y)]=1; } }

function addEnt(e){ e.id=G.nid++; G.ents.push(e); G.map[e.id]=e; return e; }
function spawnUnit(type, team, x, y){
  var d=UNT[type];
  var u = {k:'u', type:type, team:team, x:x, y:y, vx:0, vy:0, s:0, ang:Math.PI/2*(team===0?-1:1), tang:0, hp:d.hp, mhp:d.hp,
           ord:null, path:null, pi:0, tgt:0, cd:Math.random(), stun:0, cargo:0, ct:0, hs:null, vet:0, kills:0, z:d.air?40:0, sick:0, chan:0, cv:null, seen:false, rt:0, conv:true};
  if (team<2 && d.armor==='pi' && !d.horde) { u.p = makePerson(R, type); var cl=teamOf(team).soc.clans[u.p.klan]; cl.uye++; }
  addEnt(u);
  if (team<2 && teamOf(team).up.zenitzirh && (type==='tank'||type==='yz')) { u.mhp*=1.25; u.hp=u.mhp; }
  return u;
}
function footprintFree(type, tx, ty, team, ignoreRange){
  var d=BLD[type];
  for (var y=ty;y<ty+d.h;y++) for (var x=tx;x<tx+d.w;x++){
    if (!inMap(x,y)) return false;
    var k=idx(x,y); if (terrBlocked(MAP.terr[k]) || G.occ[k]) return false;
    if (MAP.terr[k]===TER.WATER || MAP.terr[k]===TER.BRIDGE) return false;
    if (MAP.cry[k] && !d.wall) return false;
  }
  // birimlerin üstüne kurma (yer birlikleri)
  var x0=tx*T, y0=ty*T, x1=(tx+d.w)*T, y1=(ty+d.h)*T;
  for (var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(e.k!=='u'||e.z>0)continue; if(e.x>x0-4&&e.x<x1+4&&e.y>y0-4&&e.y<y1+4){ if(e.team!==team) return false; } }
  if (ignoreRange) return true;
  // kendi yapılarına yakın olmalı
  var R2=d.wall?10:8;
  for (i=0;i<G.ents.length;i++){ var b=G.ents[i]; if(b.k!=='b'||b.team!==team||BLD[b.type].wall||b.type==='lamp')continue; var bd=BLD[b.type];
    var gx = Math.max(b.tx - (tx+d.w-1), tx - (b.tx+bd.w-1), 0), gy=Math.max(b.ty-(ty+d.h-1), ty-(b.ty+bd.h-1), 0);
    if (Math.max(gx,gy)<=R2) return true; }
  return false;
}
function placeBuilding(type, team, tx, ty, instant){
  var d=BLD[type];
  var b = {k:'b', type:type, team:team, tx:tx, ty:ty, x:(tx+d.w/2)*T, y:(ty+d.h/2)*T, hp:d.hp, mhp:d.hp, bp:instant?1:0, rally:null, tgt:0, cd:0, tang:Math.random()*6, repair:false, anim:Math.random()*10};
  if (team<2 && teamOf(team).disc.meteorzirh) { b.mhp*=1.15; b.hp=b.mhp; }
  addEnt(b);
  for (var y=ty;y<ty+d.h;y++) for (var x=tx;x<tx+d.w;x++){ var k=idx(x,y); G.occ[k]=b.id; if(MAP.deco[k]){MAP.deco[k]=0; HOOK.chunkDirty(x,y);} }
  // üstte kalan birlikleri it
  G.ents.forEach(function(u){ if(u.k==='u'&&!u.z&&u.x>tx*T-2&&u.x<(tx+d.w)*T+2&&u.y>ty*T-2&&u.y<(ty+d.h)*T+2){ var p=PF.nearestFree(Math.floor(u.x/T),Math.floor(u.y/T)); u.x=(p[0]+0.5)*T; u.y=(p[1]+0.5)*T; } });
  if (d.freeUnit && !instant) { var ex=exitPoint(b); var h=spawnUnit(d.freeUnit, team, ex[0], ex[1]); h.ord={k:'harvest'}; }
  if (team===ME && !instant) HOOK.sound('build', b.x, b.y);
  recalcTeam(team);
  return b;
}
function exitPoint(b){ var d=BLD[b.type]; var tx=b.tx+Math.floor(d.w/2), ty=b.ty+d.h; var p=PF.nearestFree(tx,ty); return [(p[0]+0.5)*T, (p[1]+0.5)*T]; }
function dockPoint(b){ var d=BLD[b.type]; return [ (b.tx+d.w/2)*T, (b.ty+d.h)*T+14 ]; }

function removeEnt(e){
  var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1); delete G.map[e.id];
  if (e.k==='b'){ var d=BLD[e.type]; for (var y=e.ty;y<e.ty+d.h;y++) for (var x=e.tx;x<e.tx+d.w;x++){ var k=idx(x,y); if(G.occ[k]===e.id) G.occ[k]=0; } recalcTeam(e.team); }
}

/* ---------- hasar ---------- */
function applyDmg(t, dmg, type, srcTeam, src){
  if (!t || t.hp<=0) return;
  var d=defOf(t), armor = t.k==='b' ? 'bina' : d.armor;
  var m = (DMG[type]||DMG.mermi)[armor]; if (!m) return;
  var a = srcTeam!=null && srcTeam<2 ? teamOf(srcTeam) : null;
  if (a){ if (a.up.silah) m*=1.2; if (type==='lazer'&&a.disc.plazma) m*=1.25; if (t.team===3 && a.disc.dna) m*=1.4; var cl=src&&src.p?a.soc.clans[src.p.klan]:null; if(cl) m*=0.9+cl.sadakat/500; m*= 0.85+a.soc.moral/400; }
  if (src && src.vet) m*=1+src.vet*0.1;
  var dt = t.team<2 ? teamOf(t.team) : null;
  if (dt){ if (dt.up.zirh && t.k==='u') m*=0.8; if (t.k==='b' && dt.soc.laws.gece===1 && isNight()) m*=1/1.2; }
  if (t.team===3 && !isNight()) m*=1.3; // mutantlar gün ışığında zayıf
  if (G.diff===0 && t.team===ME) m*=0.8;
  if (G.diff===2 && t.team===ME) m*=1.1;
  t.hp -= dmg*m; t.hit=G.t;
  if (t.team<2){ var tm=teamOf(t.team); tm.alert={x:t.x,y:t.y,t:G.t, by:srcTeam}; }
  if (t.k==='u' && type==='emp') {}
  if (t.hp<=0) kill(t, src, srcTeam);
}
function splash(x,y,rad,dmg,type,team,src,friendly){
  for (var i=G.ents.length-1;i>=0;i--){ var e=G.ents[i]; if(e.hp<=0)continue;
    var d = e.k==='b' ? rectDist(e,x,y) : dist(e.x,e.y,x,y);
    if (d>rad) continue; if (e.k==='u' && e.z>10 && type!=='flak' && type!=='emp' && type!=='iyon') continue;
    var f = 1 - d/rad*0.7;
    if (e.team===team) { if(!friendly)continue; f*=0.4; }
    if (e.team===2 && type!=='iyon') continue;
    if (type==='emp' && e.k==='u' && UNT[e.type].armor!=='pi') e.stun=Math.max(e.stun, (src&&UNT[src.type]&&UNT[src.type].wpn.stun)||3);
    applyDmg(e, dmg*f, type, team, src);
  }
}
function rectDist(b,x,y){ var d=BLD[b.type], x0=b.tx*T, y0=b.ty*T, x1=x0+d.w*T, y1=y0+d.h*T; var dx=Math.max(x0-x,0,x-x1), dy=Math.max(y0-y,0,y-y1); return Math.sqrt(dx*dx+dy*dy); }
function edgeDist(a,e){ return e.k==='b' ? rectDist(e,a.x,a.y) : Math.max(0, dist(a.x,a.y,e.x,e.y)-UNT[e.type].r); }

function kill(e, src, srcTeam){
  if (e.dead) return; e.dead=true; e.hp=0;
  var d=defOf(e);
  var big = e.k==='b' ? Math.min(3, (d.w*d.h)/4+0.5) : (d.mass>20000?1.4:d.mass>2000?0.9:0.35);
  if (d.armor==='pi' || (e.k==='u' && UNT[e.type].horde)) { fxBlood(e.x,e.y,e.team===3); }
  else fxExplosion(e.x, e.y - (e.z||0), big);
  if (e.k==='b'){ for (var i=0;i<6;i++) fxExplosion(e.x+(Math.random()-0.5)*d.w*T, e.y+(Math.random()-0.5)*d.h*T, 0.8+Math.random(), Math.random()*0.8); FX.decals.push({x:e.x,y:e.y,r:Math.max(d.w,d.h)*T*0.6,k:'rubble',a:Math.random()*6}); }
  else if (big>0.5) FX.decals.push({x:e.x,y:e.y,r:18*big,k:'scorch',a:Math.random()*6});
  if (FX.decals.length>220) FX.decals.splice(0,40);
  HOOK.sound(e.k==='b'?'bigboom':(big>0.5?'boom':'die'), e.x, e.y);
  if (src && src.k==='u' && src.team!==e.team){ src.kills++; var nv = src.kills>=12?3:src.kills>=6?2:src.kills>=3?1:0; if (nv>src.vet){ src.vet=nv; if(src.p) src.p.rutbe=Math.min(4,nv+(src.p.rutbe>nv?1:0)); if(src.team===ME) HOOK.msg((src.p?personTitle(src.p):UNT[src.type].ad)+' terfi etti! ★'+nv); } }
  if (srcTeam!=null && srcTeam<2) { teamOf(srcTeam).killed++; if (e.team===3) townCredit(srcTeam, e.x, e.y); var sc=teamOf(srcTeam).soc; if(src&&src.p){ sc.clans[src.p.klan].sadakat=Math.min(100,sc.clans[src.p.klan].sadakat+0.4);} sc.moral=Math.min(100, sc.moral+ (e.k==='b'?1.5:0.15)); }
  if (e.team<2){ var tm=teamOf(e.team); tm.lost++;
    if (e.p){ var cl=tm.soc.clans[e.p.klan]; cl.kayip++; cl.uye=Math.max(0,cl.uye-1); cl.sadakat=Math.max(0,cl.sadakat-1.2); tm.soc.olen++; tm.soc.moral=Math.max(0,tm.soc.moral-0.5);
      if (e.team===ME && e.vet>=2) HOOK.msg('Kahramanımız '+personTitle(e.p)+' ('+CLANS[e.p.klan].ad+') şehit düştü.'); }
    if (e.k==='b') tm.soc.moral=Math.max(0,tm.soc.moral-2);
  }
  removeEnt(e);
  if (e.k==='b' && e.type==='yard') checkOver();
}
function convertEnt(e, team, how){
  if (e.team===team) return;
  var old=e.team;
  if (e.p && old<2){ var c=teamOf(old).soc.clans[e.p.klan]; c.uye=Math.max(0,c.uye-1); }
  e.team=team; e.ord=null; e.path=null; e.tgt=0; e.cv=null; e.stun=0;
  if (e.k==='u' && team<2 && UNT[e.type].armor==='pi' && !UNT[e.type].horde && !e.p) e.p=makePerson(R,e.type);
  if (e.k==='u' && UNT[e.type].harvest) e.ord={k:'harvest'};
  if (e.k==='b') { recalcTeam(old); recalcTeam(team); }
  fxRing(e.x,e.y,'#7fe0ff',60);
  if (team===ME) HOOK.msg((how||'Ele geçirildi')+': '+defOf(e).ad, 'good');
  else if (old===ME) HOOK.msg('Düşman ele geçirdi: '+defOf(e).ad, 'bad');
  HOOK.sound('capture', e.x, e.y);
  if (e.k==='b' && e.type==='yard') checkOver();
}
function checkOver(){
  if (G.over) return;
  var has=[false,false];
  G.ents.forEach(function(e){ if(e.k==='b'&&e.type==='yard'&&e.team<2) has[e.team]=true; });
  if (!has[ME]) { G.over='lose'; HOOK.over('lose'); }
  else if (!has[1]) {
    if (G.endless) { G.ai[1].respawnAt = G.t + DAY_LEN*1.5; HOOK.msg('Kızıl Cephe üssü düştü! Kalıntıları yeni bir yerde toplanacak…','good'); }
    else { G.over='win'; HOOK.over('win'); }
  }
}

/* ---------- takım hesapları ---------- */
function recalcTeam(t){
  if (t>1) return;
  var tm=teamOf(t), pw=0, pu=0, cap=0, c={};
  var heat = SEASONS[G.season].heat;
  G.ents.forEach(function(e){ if(e.k!=='b'||e.team!==t)return; var d=BLD[e.type]; c[e.type]=(c[e.type]||0)+1;
    if (d.pow>0) pw+=d.pow * (0.5+0.5*e.hp/e.mhp); else pu+=-d.pow*heat; if (d.store) cap+=d.store; });
  tm.pw=Math.round(pw); tm.pu=Math.round(pu); tm.cap=cap; tm.counts=c;
}
function lowPower(t){ var tm=teamOf(t); return tm.pu>tm.pw; }
function has(t, type){ return (teamOf(t).counts[type]||0)>0; }
function reqMet(t, req){
  var tm=teamOf(t);
  for (var i=0;i<req.length;i++){ var r=req[i];
    if (r.indexOf('up:')===0){ if(!tm.up[r.slice(3)]) return false; }
    else if (r.indexOf('item:')===0){ if(t!==ME) continue; if(!tm.items[r.slice(5)]) return false; }
    else if (!has(t,r)) return false; }
  return true;
}
function reqText(req){ return req.map(function(r){ if(r.indexOf('up:')===0) return UPG[r.slice(3)].ad; if(r.indexOf('item:')===0) return RECIPES[r.slice(5)].ad; return BLD[r].ad; }).join(', '); }
function unitCount(t,type){ var n=0; G.ents.forEach(function(e){ if(e.k==='u'&&e.team===t&&e.type===type)n++; }); teamOf(t).q.arac.forEach(function(q){ if(q.type===type)n++; }); return n; }

/* ---------- üretim kuyruğu ---------- */
function catOf(type){ if (BLD[type]) return BLD[type].cat; if (UNT[type]) return UNT[type].from; if (UPG[type]) return 'destek'; return null; }
function costOf(type){ return BLD[type]?BLD[type].cost : UNT[type]?UNT[type].cost : UPG[type].cost; }
function timeOf(type){ return BLD[type]?BLD[type].time : UNT[type]?UNT[type].time : UPG[type].time; }
function canQueue(t, type){
  var cat=catOf(type), tm=teamOf(t); if(!cat) return 'yok';
  var d = BLD[type]||UNT[type]||UPG[type];
  if (!producerFor(t,cat)) return 'Üretici yapı yok';
  if (!reqMet(t, d.req)) return 'Gerekli: '+reqText(d.req);
  if (UPG[type] && (tm.up[type] || tm.q.destek.some(function(q){return q.type===type;}))) return 'Zaten var';
  if (d.limit && unitCount(t,type)>=d.limit) return 'En fazla '+d.limit;
  if ((cat==='bina'||cat==='savunma') && (tm.ready[cat] || tm.q[cat].length>0)) return 'Önce yerleştir';
  if (tm.q[cat].length>=12) return 'Kuyruk dolu';
  if (tm.cr < costOf(type)) return 'Para yetmiyor';
  return null;
}
function queue(t, type){
  var why=canQueue(t,type); if (why) return why;
  var tm=teamOf(t), cat=catOf(type);
  tm.cr -= costOf(type);
  if (type==='yz' && t===ME) tm.items.cpu--;
  tm.q[cat].push({type:type, p:0, paid:costOf(type)});
  return null;
}
function cancelQueue(t, cat, i){
  var tm=teamOf(t), q=tm.q[cat][i]; if(!q) return;
  tm.cr += q.paid; if (q.type==='yz' && t===ME) tm.items.cpu++;
  tm.q[cat].splice(i,1);
}
function producerFor(t, cat){
  var best=null;
  for (var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(e.k!=='b'||e.team!==t||e.bp<1)continue; var m=BLD[e.type].makes; if(m&&m.indexOf(cat)>=0){ if(!best||e.primary)best=e; } }
  return best;
}
function updateQueues(t, dt){
  var tm=teamOf(t), soc=tm.soc;
  var spd = lowPower(t) ? 0.4 : 1;
  spd *= 0.8 + soc.moral/250;
  if (t!==ME) spd *= [0.7,1.0,1.35][G.diff];
  for (var cat in tm.q){
    var q=tm.q[cat]; if(!q.length) continue;
    if ((cat==='bina'||cat==='savunma') && tm.ready[cat]) continue;
    var pr=producerFor(t,cat); if(!pr) continue;
    var it=q[0], tt=Math.max(0.5,timeOf(it.type));
    var catSpd = spd * (cat==='piyade' ? LAWS.askerlik.secenek[soc.laws.askerlik].hiz : 1);
    // aynı türden birden çok üretici hızlandırır
    it.p += dt/tt * catSpd * (1 + 0.25*Math.max(0,(tm.counts[pr.type]||1)-1));
    if (it.p>=1){
      q.shift();
      if (BLD[it.type]) { tm.ready[cat]=it.type; if(t===ME){ HOOK.msg(BLD[it.type].ad+' hazır — yerleştir!'); HOOK.sound('ready'); } }
      else if (UPG[it.type]) { tm.up[it.type]=1; if(t===ME){ HOOK.msg('Gelişim tamam: '+UPG[it.type].ad,'good'); HOOK.sound('ready'); } if(it.type==='radar'&&t===ME) G.explored.fill(1); }
      else {
        var ex=exitPoint(pr), u=spawnUnit(it.type, t, ex[0], ex[1]);
        if (UNT[it.type].air){ u.x=pr.x; u.y=pr.y; }
        if (UNT[it.type].harvest) u.ord={k:'harvest'};
        else if (pr.rally) orderMove([u], pr.rally[0], pr.rally[1]);
        else { var a=Math.random()*6.28; orderMove([u], ex[0]+Math.cos(a)*50, ex[1]+30+Math.sin(a)*30); }
        if (t===ME) { HOOK.msg(UNT[it.type].ad+' hazır'); HOOK.sound('unit'); }
      }
    }
  }
}
function tryPlace(t, cat, tx, ty){
  var tm=teamOf(t), type=tm.ready[cat]; if(!type) return false;
  if (!footprintFree(type, tx, ty, t)) return false;
  placeBuilding(type, t, tx, ty);
  tm.ready[cat]=null;
  return true;
}
function placeCrafted(t, rk, tx, ty){
  var r=RECIPES[rk], tm=teamOf(t);
  if (!canCraft(t,rk)) return false;
  if (!footprintFree(r.yap, tx, ty, t)) return false;
  payCraft(t,rk); placeBuilding(r.yap, t, tx, ty, true); return true;
}
function canCraft(t, rk){ var r=RECIPES[rk], tm=teamOf(t); if (tm.cr<r.cr) return false; for (var m in r.mat) if ((tm.mat[m]||0)<r.mat[m]) return false; if (r.up && tm.up[r.up]) return false; return true; }
function payCraft(t, rk){ var r=RECIPES[rk], tm=teamOf(t); tm.cr-=r.cr; for (var m in r.mat) tm.mat[m]-=r.mat[m]; }
function craft(t, rk){
  var r=RECIPES[rk], tm=teamOf(t); if (!canCraft(t,rk) || r.yap) return false;
  payCraft(t,rk);
  if (r.item) tm.items[r.item]=(tm.items[r.item]||0)+1;
  if (r.up) { tm.up[r.up]=1; G.ents.forEach(function(e){ if(e.k==='u'&&e.team===t&&(e.type==='tank'||e.type==='yz')){ e.mhp*=1.25; e.hp*=1.25; } }); }
  return true;
}
function sellBuilding(b){ if(!b||b.type==='yard')return; var tm=teamOf(b.team); tm.cr += Math.floor(BLD[b.type].cost*0.5*b.hp/b.mhp); fxExplosion(b.x,b.y,0.6); removeEnt(b); for(var i=0;i<2;i++){ var ex=[b.x+(i-0.5)*20,b.y]; spawnUnit('worker', b.team, ex[0], ex[1]); } }
