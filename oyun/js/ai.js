/* ORDU SAVAŞI: KOMUTA — rakip yapay zeka (Kızıl Cephe): üs kurar, toplar, karşı birlik seçer, akın yapar, ajan yollar */
var AI_ORDER = ['power','refinery','barracks','power','factory','refinery','tower_mg','tower_cannon','power','tower_aa','armory','power','airfield','tower_mg','silo','lab','power','tower_cannon','refinery','power','uplink','tower_aa','tower_cannon','power','factory','silo'];
function aiNew(t){ return {t:t, base:{x:BASES[t].x, y:BASES[t].y}, wave:0, nextWave: [420,330,260][G.diff], nextAgent: 200, lastDef:0, upg:0, respawnAt:0}; }
function aiTick(t, dt){
  var ai=G.ai[t], tm=teamOf(t); if (!ai) return;
  if (!has(t,'yard') && !G.endless) return;
  // 1) hazır yapıyı yerleştir
  ['bina','savunma'].forEach(function(cat){ var ty=tm.ready[cat]; if(!ty) return; var p=aiSpot(t, ty); if (p) tryPlace(t,cat,p[0],p[1]); else tm.ready[cat]=null; });
  // 2) güç açığı -> santral
  var want=null;
  if (tm.pu > tm.pw-10 && !tm.q.bina.length && !tm.ready.bina) want='power';
  // 3) yapım sırası
  if (!want && !tm.q.bina.length && !tm.ready.bina){
    var cnt={};
    for (var i=0;i<AI_ORDER.length;i++){ var b=AI_ORDER[i]; cnt[b]=(cnt[b]||0)+1; if ((tm.counts[b]||0) < cnt[b]) { want=b; break; } }
  }
  var saving=0;
  if (want){ var cat=BLD[want].cat; if (!tm.q[cat].length && !tm.ready[cat]) { if (queue(t,want)) saving=BLD[want].cost; } }
  // savunma kuyruğu (ayrı)
  if (!tm.q.savunma.length && !tm.ready.savunma && tm.cr>1500 && has(t,'factory')){ var tw=['tower_mg','tower_cannon','tower_aa'][Math.floor(Math.random()*3)]; var cntT=(tm.counts[tw]||0); if (cntT< 2+G.day/2) queue(t,tw); }
  if (!tm.q.savunma.length && !tm.ready.savunma && tm.cr>800 && has(t,'factory') && isNight() && Math.random()<0.15) queue(t,'wall');
  // 4) toplayıcılar
  var harv=0, army=[], agents=0, yz=0;
  G.ents.forEach(function(e){ if(e.team!==t||e.k!=='u')return; var d=UNT[e.type]; if(d.harvest)harv++; else if(d.capture)agents++; else if(d.wpn) army.push(e); if(e.type==='yz')yz++; });
  var refs=tm.counts.refinery||0;
  var needH = refs && harv < Math.min(6, refs*2) && !tm.q.arac.some(function(q){return q.type==='harvester';});
  if (needH && has(t,'factory')) { if (queue(t,'harvester')) saving=Math.max(saving,1400); }
  // 5) gelişimler
  if (tm.counts.armory && tm.cr>2500){ ['zirh','silah','hasat'].forEach(function(u){ if(!tm.up[u]) queue(t,u); }); }
  if (tm.counts.lab && tm.cr>3500){ ['yzcore','gizli'].forEach(function(u){ if(!tm.up[u]) queue(t,u); }); }
  // 6) karşı birlik seçimi
  var pl = {air:0, inf:0, heavy:0, yz:0, horde:0};
  G.ents.forEach(function(e){ if(e.k!=='u')return; if(e.team===3){pl.horde++;return;} if(e.team===t||e.team===2)return; var d=UNT[e.type]; if(d.air)pl.air++; else if(d.armor==='pi')pl.inf++; else pl.heavy++; if(e.type==='yz')pl.yz++; });
  var mins=[0.75,1,1.2][G.diff];
  if (army.length>=6 && saving && tm.cr<saving+300) mins=99;
  if (tm.cr > 400*mins){
    if (!tm.q.piyade.length && has(t,'barracks')){ var r=Math.random(); queue(t, pl.heavy+pl.air>pl.inf && r<0.6 ? 'rocket' : 'rifle'); }
    if (tm.q.arac.length<2 && has(t,'factory')){
      var pick='tank', r2=Math.random();
      if (pl.yz && r2<0.5 && has(t,'lab')) pick='emp';
      else if (pl.air>2 && r2<0.5) pick='aa';
      else if (pl.inf>pl.heavy*1.5 && r2<0.4) pick='jeep';
      else if (has(t,'lab') && r2<0.2) pick='arty';
      else if (has(t,'lab') && tm.up.yzcore && !yz && tm.cr>6500 && G.diff>0) pick='yz';
      if (pick!=='yz' || unitCount(t,'yz')<1) queue(t,pick);
    }
    if (!tm.q.hava.length && has(t,'airfield') && Math.random()<0.5) queue(t, has(t,'lab')&&Math.random()<0.4?'drone':'heli');
  }
  // 7) savunma: saldırı altındaysa boştaki birlikler oraya
  if (tm.alert && G.t-tm.alert.t<4 && G.t-ai.lastDef>6 && dist(tm.alert.x/T,tm.alert.y/T,ai.base.x,ai.base.y)<26){
    ai.lastDef=G.t; var defs=army.filter(function(u){ return !u.ord || u.ord.k!=='amove' || u.home; });
    defs.forEach(function(u){ u.home=true; }); orderMove(defs, tm.alert.x, tm.alert.y, true);
  }
  // 8) akın
  if (G.t > ai.nextWave){
    var need = Math.min(30, 5 + ai.wave*3);
    var free = army.filter(function(u){ return UNT[u.type].wpn; });
    if (free.length >= need){
      var target = aiPickTarget(t);
      if (target){ free.forEach(function(u){u.home=false;}); orderMove(free, target.x, target.y, true); ai.wave++; if (t!==ME) HOOK.msg('⚠ Düşman saldırısı başladı! ('+free.length+' birlik)','bad'); HOOK.sound('alarm'); }
      ai.nextWave = G.t + [260,190,140][G.diff];
    } else ai.nextWave = G.t + 20;
  }
  // 9) ajan görevleri: tarafsız petrol kuyusu ya da oyuncu yapısı
  if (G.t > ai.nextAgent && has(t,'barracks')){
    ai.nextAgent = G.t + [300,220,160][G.diff];
    if (agents<2) queue(t,'agent');
  }
  G.ents.forEach(function(e){ if (e.team===t && e.k==='u' && UNT[e.type].capture && !e.ord){
    var tg=null, bd=1e9; G.ents.forEach(function(b){ if (b.k!=='b'||b.team===t||b.team===3) return; if (b.team===ME && BLD[b.type].wpn) return; var w = b.team===2?0.7:(b.type==='refinery'||b.type==='power'?0.8:1.2); var d=dist(e.x,e.y,b.x,b.y)*w; if(d<bd){bd=d;tg=b;} });
    if (tg) orderCapture([e], tg); } });
  // 10) işçiler
  G.ents.forEach(function(e){ if(e.team===t&&e.k==='u'&&UNT[e.type].gather&&!e.ord) { if (G.loot.some(function(L){return !L.done;}) && Math.random()<0.3){ var li=-1, bd=1e9; G.loot.forEach(function(L,i){ if(L.done)return; var d=dist(e.x,e.y,L.x,L.y); if(d<bd&&d<40*T){bd=d;li=i;} }); if(li>=0){ orderLoot([e],li); return; } } autoGather(e); } });
  // 11) süper silah
  if (tm.sw>=BLD.uplink.sw && has(t,'uplink')){ var tg2=aiPickTarget(t, true); if (tg2) fireIon(t, tg2.x, tg2.y); }
  // 12) ekonomi hileleri yok; zorlukta ek gelir
  if (G.diff===2) tm.cr += 3*dt;
}
function aiPickTarget(t, sw){
  var best=null, bs=-1, ai=G.ai[t];
  G.ents.forEach(function(e){ if(e.team!==ME||e.k!=='b') return; var v={yard:5, factory:4, refinery:4, power:3, airfield:3, lab:4, uplink:6, barracks:2}[e.type]||1; if (sw && e.type==='yard') v=2;
    var s = v*1000/(dist(e.x/T,e.y/T,ai.base.x,ai.base.y)+20) * (0.7+Math.random()*0.6); if (s>bs){bs=s;best=e;} });
  return best;
}
function aiSpot(t, type){
  var ai=G.ai[t], d=BLD[type], b=ai.base;
  var tries=0, bestP=null;
  for (var r=3; r<16; r++){
    for (var a=0;a<16;a++){ tries++;
      var ang=Math.random()*Math.PI*2, tx=Math.round(b.x+Math.cos(ang)*r - d.w/2), ty=Math.round(b.y+Math.sin(ang)*r - d.h/2);
      if (!d.wall && !occFree(tx-1,ty-1,d.w+2,d.h+2)) continue; // bir karo boşluk bırak
      if (footprintFree(type, tx, ty, t)) {
        if (BLD[type].wpn){ // kuleleri oyuncuya doğru diz
          var pb=BASES[ME], toward = dist(tx,ty,pb.x,pb.y) < dist(b.x,b.y,pb.x,pb.y); if (!toward && Math.random()<0.7) continue; }
        return [tx,ty]; }
    }
  }
  return bestP;
}
function occFree(x0,y0,w,h){ for (var y=y0;y<y0+h;y++) for (var x=x0;x<x0+w;x++){ if(!inMap(x,y)) return false; if (G.occ[idx(x,y)]) return false; } return true; }
