/* ORDU SAVAŞI: KOMUTA — arayüz: üst bar, yan menü, mini harita, seçim paneli, dokunmatik + fare kontrolleri */
var UI={tab:'bina', speed:1, paused:true, boxMode:false, lastTap:0, lastTapEnt:null, keys:{}, mm:null, mmBase:null, toastN:0};
function $(id){ return document.getElementById(id); }
function uiMsg(text, kind){
  var box=$('toasts'), d=document.createElement('div'); d.className='toast '+(kind||''); d.textContent=text; box.appendChild(d);
  while (box.children.length>5) box.removeChild(box.firstChild);
  setTimeout(function(){ d.classList.add('out'); setTimeout(function(){ d.remove(); }, 600); }, kind==='bad'?6000:4200);
  var log=$('logList'); if (log){ var l=document.createElement('div'); l.textContent='['+G.day+'. gün] '+text; log.insertBefore(l, log.firstChild); while (log.children.length>80) log.removeChild(log.lastChild); }
}
HOOK.msg=uiMsg; HOOK.sound=sfx; HOOK.chunkDirty=chunkDirty;
HOOK.over=function(r){ $('overTitle').textContent = r==='win'?'ZAFER!':'YENİLGİ'; $('overText').textContent = r==='win' ? 'Kızıl Cephe\'nin Komuta Merkezi düştü. '+G.day+'. günde kazandın! İstersen dünya sonsuza kadar sürsün: yeni düşmanlar, sürüler ve meteorlar gelmeye devam eder.' : 'Komuta Merkezin yok oldu. Kayıttan devam edebilir ya da yeni oyuna başlayabilirsin.';
  $('overEndless').style.display = r==='win'?'':'none'; $('over').classList.remove('hide'); sfx(r==='win'?'win':'lose'); };

/* ---------- yan menü ---------- */
var TABS=[{id:'bina',ad:'Yapı',ikon:'🏗'},{id:'savunma',ad:'Savunma',ikon:'🛡'},{id:'piyade',ad:'Piyade',ikon:'🪖'},{id:'arac',ad:'Araç',ikon:'🚜'},{id:'hava',ad:'Hava',ikon:'✈'},{id:'destek',ad:'Gelişim',ikon:'🔬'},{id:'zanaat',ad:'Zanaat',ikon:'🔨'}];
function itemsFor(tab){
  if (tab==='bina') return ['power','refinery','silo','barracks','factory','airfield','armory','lab','uplink'];
  if (tab==='savunma') return ['tower_mg','tower_cannon','tower_aa','wall'];
  if (tab==='destek') return Object.keys(UPG);
  if (tab==='zanaat') return Object.keys(RECIPES);
  return Object.keys(UNT).filter(function(k){ return UNT[k].from===tab; });
}
function buildSidebar(){
  var tb=$('tabs'); tb.innerHTML='';
  TABS.forEach(function(t){ var b=document.createElement('button'); b.className='tab'+(UI.tab===t.id?' on':''); b.innerHTML='<span>'+t.ikon+'</span><small>'+t.ad+'</small>'; b.onclick=function(){ UI.tab=t.id; sfx('click'); buildSidebar(); }; b.id='tab_'+t.id; tb.appendChild(b); });
  var gr=$('grid'); gr.innerHTML='';
  itemsFor(UI.tab).forEach(function(type){
    var d=BLD[type]||UNT[type]||UPG[type]||RECIPES[type];
    var b=document.createElement('div'); b.className='item'; b.dataset.type=type;
    var img=document.createElement('img'); img.src=makeIcon(type).toDataURL(); b.appendChild(img);
    var cost = RECIPES[type] ? recipeCostText(RECIPES[type]) : '₺'+costOf(type);
    b.insertAdjacentHTML('beforeend','<div class="nm">'+d.ad+'</div><div class="cs">'+cost+'</div><div class="pg"></div><div class="lk"></div><div class="ct"></div><div class="rd">HAZIR</div>');
    b.onclick=function(ev){ ev.stopPropagation(); itemClick(type); };
    b.oncontextmenu=function(ev){ ev.preventDefault(); itemCancel(type); };
    var lp=null; b.addEventListener('touchstart',function(){ lp=setTimeout(function(){ lp='done'; itemCancel(type); },600); },{passive:true});
    b.addEventListener('touchend',function(e){ if(lp==='done'){ e.preventDefault(); } else clearTimeout(lp); lp=null; });
    b.onmouseenter=function(){ showTip(type,b); }; b.onmouseleave=function(){ $('tip').classList.add('hide'); };
    gr.appendChild(b);
  });
  updateSidebar();
}
function recipeCostText(r){ var s=[]; for (var m in r.mat) s.push(r.mat[m]+MATS[m].ikon); if (r.cr) s.push('₺'+r.cr); return s.join(' '); }
function showTip(type, el){
  var d=BLD[type]||UNT[type]||UPG[type]||RECIPES[type], h='<b>'+d.ad+'</b><br>';
  if (d.bilgi) h+=d.bilgi+'<br>';
  if (UNT[type]) h+='<span class="g">Güçlü: '+d.guclu+'</span><br><span class="r">Zayıf: '+d.zayif+'</span><br>Can '+d.hp+' • Hız '+d.spd+' • Kütle '+(d.mass>=1000?(d.mass/1000)+' ton':d.mass+' kg');
  if (BLD[type]) h+='Elektrik: '+(d.pow>0?'+':'')+d.pow+' • Can '+d.hp;
  var why = RECIPES[type] ? (canCraft(ME,type)?null:'Malzeme yetmiyor') : canQueue(ME,type);
  if (why && why!=='Önce yerleştir') h+='<br><span class="r">'+why+'</span>';
  var t=$('tip'); t.innerHTML=h; t.classList.remove('hide'); var r=el.getBoundingClientRect(); t.style.top=Math.max(4,Math.min(r.top, innerHeight-t.offsetHeight-4))+'px'; t.style.right=(innerWidth-r.left+6)+'px';
}
function itemClick(type){
  audioInit(); var tm=teamOf(ME);
  if (RECIPES[type]){ var r=RECIPES[type]; if (!canCraft(ME,type)) { uiMsg('Malzeme yetmiyor: '+recipeCostText(r),'bad'); return; }
    if (r.yap){ GHOST={type:r.yap, recipe:type, tx:null, ty:null}; showPlaceBar(true); uiMsg('Yerleştirmek için haritaya dokun'); return; }
    craft(ME,type); uiMsg('Üretildi: '+r.ad,'good'); sfx('ready'); updateSidebar(); return; }
  var cat=catOf(type);
  if ((cat==='bina'||cat==='savunma') && tm.ready[cat]===type){ GHOST={type:type, cat:cat, tx:null, ty:null}; showPlaceBar(true); uiMsg('Yeşil alana yerleştir'); return; }
  var why=queue(ME,type);
  if (why){ uiMsg(why,'bad'); sfx('click'); } else sfx('click');
  updateSidebar();
}
function itemCancel(type){
  var cat=catOf(type); if(!cat) return; var tm=teamOf(ME), q=tm.q[cat];
  for (var i=q.length-1;i>=0;i--) if (q[i].type===type){ cancelQueue(ME,cat,i); uiMsg('İptal edildi, para iade'); updateSidebar(); return; }
  if (tm.ready[cat]===type){ tm.ready[cat]=null; tm.cr+=costOf(type); uiMsg('İptal edildi, para iade'); updateSidebar(); }
}
function updateSidebar(){
  var tm=teamOf(ME), items=$('grid').children;
  for (var i=0;i<items.length;i++){ var el=items[i], type=el.dataset.type;
    var lock='', prog=0, cnt=0, ready=false;
    if (RECIPES[type]) { lock = canCraft(ME,type)?'':'x'; if (RECIPES[type].item) cnt=tm.items[RECIPES[type].item]||0; if (RECIPES[type].up && tm.up[RECIPES[type].up]) { lock='✔'; } }
    else { var cat=catOf(type), q=tm.q[cat]; q.forEach(function(it,j){ if(it.type===type){ cnt++; if(j===0) prog=it.p; } });
      ready = tm.ready[cat]===type;
      var why=canQueue(ME,type); if (why && why!=='Para yetmiyor' && why!=='Önce yerleştir' && why!=='Kuyruk dolu' && !cnt && !ready) lock = why.indexOf('Gerekli')===0?'🔒':(why==='Zaten var'?'✔':'🔒');
      if (UPG[type] && tm.up[type]) lock='✔';
      if (why==='Para yetmiyor' && !cnt) el.classList.add('poor'); else el.classList.remove('poor'); }
    el.classList.toggle('locked', !!lock && lock!=='✔'); el.classList.toggle('done', lock==='✔'); el.classList.toggle('ready', ready);
    el.querySelector('.lk').textContent = lock==='x'?'':lock;
    el.querySelector('.pg').style.height = (prog*100)+'%';
    el.querySelector('.ct').textContent = cnt>1||(cnt&&RECIPES[type]) ? cnt : '';
  }
  TABS.forEach(function(t){ var b=$('tab_'+t.id); if(!b) return; var ok = t.id==='zanaat' || t.id==='destek' ? true : !!producerFor(ME, t.id==='savunma'?'savunma':t.id); var rd = (t.id==='bina'||t.id==='savunma') && tm.ready[t.id]; b.classList.toggle('dim', !ok); b.classList.toggle('blink', !!rd); });
}

/* ---------- üst bar ---------- */
function updateTopBar(){
  var tm=teamOf(ME);
  $('cr').textContent=Math.floor(tm.cr); $('cap').textContent='/'+tm.cap;
  var pf = tm.pw>0 ? clamp(tm.pu/tm.pw,0,1.5) : 1.5; $('powFill').style.width=Math.min(100,pf/1.5*100)+'%'; $('powFill').style.background = tm.pu>tm.pw?'#f44':pf>0.85?'#fc3':'#4e4';
  $('powTxt').textContent=tm.pu+'/'+tm.pw;
  var hr=Math.floor(((G.t%DAY_LEN)/DAY_LEN*24+6)%24), mn=Math.floor(((G.t%DAY_LEN)/DAY_LEN*24*60)%60);
  $('clock').textContent=(isNight()?'🌙 ':'☀ ')+(hr<10?'0':'')+hr+':'+(mn<10?'0':'')+mn;
  $('day').textContent=G.day+'. gün • '+SEASONS[G.season].ikon+' '+SEASONS[G.season].ad+' • '+G.year+'. yıl';
  $('moral').textContent='🙂 '+Math.round(tm.soc.moral)+'%';
  var m=''; for (var k in MATS) m+='<span title="'+MATS[k].ad+'">'+MATS[k].ikon+Math.floor(tm.mat[k])+'</span>'; $('mats').innerHTML=m;
  var sw=$('swBtn'); if (has(ME,'uplink')){ sw.classList.remove('hide'); var f=tm.sw/BLD.uplink.sw; sw.textContent = f>=1 ? '⚡ İYON HAZIR' : '⚡ '+Math.floor(f*100)+'%'; sw.classList.toggle('ready', f>=1); } else sw.classList.add('hide');
}

/* ---------- seçim paneli ---------- */
function updateSelPanel(){
  SEL=SEL.filter(function(e){ return !e.dead && G.map[e.id]; });
  var p=$('selp');
  if (!SEL.length){ p.classList.add('hide'); p.classList.remove('open'); return; }
  p.classList.remove('hide');
  var e=SEL[0], d=defOf(e), own=e.team===ME, h='';
  if (SEL.length===1){
    h+='<div class="sn">'+d.ad+(e.team!==ME?' <span class="r">('+TEAM_NAMES[e.team]+')</span>':'')+'</div>';
    if (e.p) h+='<div class="sp">'+personTitle(e.p)+' • '+CLANS[e.p.klan].ikon+' '+CLANS[e.p.klan].ad+(e.kills?' • '+e.kills+' düşman':'')+'</div>';
    h+='<div class="hpb"><i style="width:'+(e.hp/e.mhp*100)+'%"></i></div><div class="sp">Can '+Math.ceil(e.hp)+'/'+Math.round(e.mhp)+(e.k==='u'&&d.mass?' • '+(d.mass>=1000?(d.mass/1000)+' t':d.mass+' kg'):'')+(e.sick?' • ☣ Hasta':'')+(e.stun>0?' • ⚡ Kilitli':'')+'</div>';
    if (e.k==='u' && d.guclu) h+='<div class="sp"><span class="g">▲ '+d.guclu+'</span><br><span class="r">▼ '+d.zayif+'</span></div>';
    if (e.k==='u' && d.harvest) h+='<div class="sp">Yük: '+Math.round(e.cargo/HCAP*100)+'%</div>';
    if (e.k==='b' && d.bilgi) h+='<div class="sp">'+d.bilgi+'</div>';
  } else {
    var c={}; SEL.forEach(function(s){ var n=defOf(s).ad; c[n]=(c[n]||0)+1; });
    h+='<div class="sn">'+SEL.length+' birlik seçili</div><div class="sp">'+Object.keys(c).map(function(k){ return c[k]+'× '+k; }).join(', ')+'</div>';
  }
  var acts=[];
  if (own){
    var units=SEL.filter(function(s){ return s.k==='u'; });
    if (units.length){ acts.push(['⏹ Dur','stop']); if (units.some(function(u){return UNT[u.type].wpn;})) acts.push(['⚔ Saldırı yürüyüşü','amove']); }
    if (units.some(function(u){return UNT[u.type].capture;})) acts.push(['🎯 Ajan Görevi','agent']);
    if (units.some(function(u){return UNT[u.type].convert;})) acts.push([units.some(function(u){return u.conv;})?'🧠 Dönüştürme: AÇIK':'🧠 Dönüştürme: KAPALI','conv']);
    if (units.some(function(u){return UNT[u.type].gather;})) acts.push(['🪓 Odun/Taş topla','gather'], ['📦 Yağmala','loot']);
    if (units.some(function(u){return UNT[u.type].science;}) && G.meteors.some(function(m){return m.sample>0;})) acts.push(['🔬 Meteora git','study']);
    if (units.some(function(u){return UNT[u.type].armor==='pi';}) && teamOf(ME).items.medkit>0) acts.push(['⛑ Sağlık kiti ('+teamOf(ME).items.medkit+')','medkit']);
    if (units.length && teamOf(ME).items.mine>0) acts.push(['💣 Mayın koy ('+teamOf(ME).items.mine+')','mine']);
    if (SEL.length===1 && e.k==='b'){ if (e.type!=='yard' && BLD[e.type].cost) acts.push(['💲 Sat','sell']); if (e.hp<e.mhp) acts.push([e.repair?'🔧 Onarılıyor…':'🔧 Onar','repair']); if (BLD[e.type].makes) acts.push(['🚩 Toplanma noktası','rally'], [e.primary?'★ Ana üretici':'☆ Ana üretici yap','primary']); }
  }
  h+='<div class="acts">'+acts.map(function(a){ return '<button data-a="'+a[1]+'">'+a[0]+'</button>'; }).join('')+'</div>';
  if (p._h!==h){ p.innerHTML=h; p._h=h; p.querySelectorAll('button').forEach(function(b){ b.onclick=function(ev){ ev.stopPropagation(); selAction(b.dataset.a); }; }); }
}
function selAction(a){
  audioInit(); sfx('click');
  var units=SEL.filter(function(s){ return s.k==='u' && s.team===ME; }), e=SEL[0];
  if (a==='stop') orderStop(units);
  if (a==='amove'){ TARGETING={kind:'amove'}; uiMsg('Saldırı yürüyüşü: hedef noktaya dokun'); }
  if (a==='agent'){ TARGETING={kind:'agent'}; uiMsg('Ajan görevi: ele geçirilecek düşman yapı/aracına dokun (gizlice gider)'); }
  if (a==='conv') { var on=!units.some(function(u){return u.conv;}); units.forEach(function(u){ if(UNT[u.type].convert){ u.conv=on; if(!on) u.cv=null; } }); }
  if (a==='gather'){ var w=units.filter(function(u){return UNT[u.type].gather;}); w.forEach(function(u){ var p=findDeco(u.x/T|0,u.y/T|0); if(p) orderGather([u],p[0],p[1]); }); uiMsg('İşçiler en yakın ağaç ve taşa gidiyor'); }
  if (a==='loot'){ units.filter(function(u){return UNT[u.type].armor==='pi';}).forEach(function(u){ var li=-1, bd=1e9; G.loot.forEach(function(L,i){ if(L.done||!G.explored[idx(L.x/T|0,L.y/T|0)])return; var d=dist(u.x,u.y,L.x,L.y); if(d<bd){bd=d;li=i;} }); if (li>=0) orderLoot([u],li); else uiMsg('Keşfedilmiş ganimet yok. Haritayı keşfet!'); }); }
  if (a==='study'){ var m=null, bd=1e9; G.meteors.forEach(function(x){ if(x.sample>0){ var d=dist(units[0].x,units[0].y,x.x,x.y); if(d<bd){bd=d;m=x;} } }); if (m){ orderStudy(units,m); revealAround(m.x/T|0,m.y/T|0,5); } }
  if (a==='medkit'){ var tm=teamOf(ME); if (tm.items.medkit>0){ tm.items.medkit--; units.forEach(function(u){ if(UNT[u.type].armor==='pi'){ u.hp=u.mhp; u.sick=0; fxRing(u.x,u.y,'#6f6',20); } }); uiMsg('Askerler iyileşti','good'); } }
  if (a==='mine'){ var tm2=teamOf(ME); if (tm2.items.mine>0){ tm2.items.mine--; G.mines.push({x:units[0].x,y:units[0].y,team:ME}); uiMsg('Mayın yerleştirildi'); } }
  if (a==='sell'){ if (confirmTwice('sell', 'Satmak için tekrar bas')) { sellBuilding(e); SEL=[]; } }
  if (a==='repair'){ e.repair=!e.repair; }
  if (a==='rally'){ TARGETING={kind:'rally', b:e}; uiMsg('Toplanma noktasını seç'); }
  if (a==='primary'){ G.ents.forEach(function(b){ if (b.k==='b'&&b.team===ME&&b.type===e.type) b.primary=false; }); e.primary=true; }
  updateSelPanel();
}
var CONFIRM={};
function confirmTwice(k, msg){ var now=Date.now(); if (CONFIRM[k] && now-CONFIRM[k]<2500){ CONFIRM[k]=0; return true; } CONFIRM[k]=now; uiMsg(msg); return false; }

/* ---------- mini harita ---------- */
function buildMinimapBase(){
  var c=document.createElement('canvas'); c.width=c.height=N; var g=c.getContext('2d'), img=g.createImageData(N,N), D=img.data;
  var P=PAL[G.season];
  for (var i=0;i<N*N;i++){ var t=MAP.terr[i], col = t===TER.WATER?P.water: t===TER.ROCK?P.rock: t===TER.URBAN?[90,92,96]: t===TER.ROAD||t===TER.BRIDGE?[70,70,72]: t===TER.PLAZA?P.plaza: t===TER.SAND?P.sand: t===TER.DIRT?P.dirt:P.grass;
    if (MAP.deco[i] && isTree(MAP.deco[i])) col=[col[0]*0.7,col[1]*0.8,col[2]*0.7];
    D[i*4]=col[0]; D[i*4+1]=col[1]; D[i*4+2]=col[2]; D[i*4+3]=255; }
  g.putImageData(img,0,0); UI.mmBase=c; UI.mmSeason=G.season;
}
function drawMinimap(){
  var cv=$('mini'), g=cv.getContext('2d'), S=cv.width;
  if (!UI.mmBase || UI.mmSeason!==G.season || UI.mmDirty){ buildMinimapBase(); UI.mmDirty=false; }
  g.imageSmoothingEnabled=false; g.drawImage(UI.mmBase,0,0,S,S);
  var k=S/N;
  for (var y=0;y<N;y+=2) for (var x=0;x<N;x+=2){ var i=y*N+x; if (MAP.cry[i] && G.explored[i]){ g.fillStyle=ORES[MAP.ore[i]].renk; g.fillRect(x*k,y*k,2*k,2*k); } }
  G.ents.forEach(function(e){ if (!entVisible(e)) return; g.fillStyle=TEAM_COLORS[e.team]; if (e.k==='b'){ var d=BLD[e.type]; g.fillRect(e.tx*k,e.ty*k,Math.max(2,d.w*k),Math.max(2,d.h*k)); } else g.fillRect(e.x/T*k-1,e.y/T*k-1,2.5,2.5); });
  G.meteors.forEach(function(m){ g.fillStyle='#d5f'; g.fillRect(m.x/T*k-2,m.y/T*k-2,4,4); });
  // sis
  if (!UI.mmFog) { UI.mmFog=document.createElement('canvas'); UI.mmFog.width=UI.mmFog.height=N; }
  if (FOG_CV) g.drawImage(FOG_CV,0,0,S,S);
  // kamera
  g.strokeStyle='#fff'; g.lineWidth=1; g.strokeRect(CAM.x/T*k, CAM.y/T*k, VIEW.w/CAM.z/T*k, VIEW.h/CAM.z/T*k);
  var tm=teamOf(ME); if (tm.alert && G.t-tm.alert.t<3 && tm.alert.by!=null && Math.sin(G.t*10)>0){ g.strokeStyle='#f33'; g.lineWidth=2; g.beginPath(); g.arc(tm.alert.x/T*k, tm.alert.y/T*k, 6, 0, 6.283); g.stroke(); }
}
function minimapPoint(ev){ var r=$('mini').getBoundingClientRect(); var fx=(ev.clientX-r.left)/r.width, fy=(ev.clientY-r.top)/r.height; return [fx*N*T, fy*N*T]; }
function centerOn(x,y){ CAM.x=x-VIEW.w/CAM.z/2; CAM.y=y-VIEW.h/CAM.z/2; clampCam(); }

/* ---------- kontroller ---------- */
var PTR={}, PINCH=null;
function ownMobileUnits(){ return SEL.filter(function(s){ return s.team===ME && s.k==='u' && !s.dead; }); }
function pick(wx, wy, slop){
  var best=null, bd=1e9;
  for (var i=G.ents.length-1;i>=0;i--){ var e=G.ents[i]; if (!entVisible(e)) continue;
    if (e.k==='u'){ var d=UNT[e.type], dd=dist(wx,wy,e.x,e.y-(e.z||0)); if (dd<d.r+slop && dd<bd){ bd=dd; best=e; } }
    else { var b=BLD[e.type]; if (wx>=e.tx*T && wx<(e.tx+b.w)*T && wy>=e.ty*T-b.H && wy<(e.ty+b.h)*T){ if (!best || best.k==='b') { best=e; bd=slop; } } } }
  return best;
}
function lootAt(wx,wy){ for (var i=0;i<G.loot.length;i++){ var L=G.loot[i]; if(!L.done && dist(L.x,L.y,wx,wy)<20 && G.explored[idx(L.x/T|0,L.y/T|0)]) return i; } return -1; }
function meteorAt(wx,wy){ for (var i=0;i<G.meteors.length;i++){ var m=G.meteors[i]; if (dist(m.x,m.y,wx,wy)<50) return m; } return null; }
function setupInput(){
  var c=CV;
  c.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  c.addEventListener('pointerdown', function(e){ audioInit(); try { c.setPointerCapture(e.pointerId); } catch (err) {}
    var rec={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:Date.now(),btn:e.button,type:e.pointerType,moved:false,driving:false,pan:false,grab:null,lastCmd:0};
    if (e.pointerType!=='mouse' && !UI.boxMode && !GHOST){ var gw=screenToWorld(e.clientX,e.clientY); rec.grab=pick(gw[0],gw[1],18); }
    PTR[e.pointerId]=rec;
    var ids=Object.keys(PTR); if (ids.length===2){ var a=PTR[ids[0]], b=PTR[ids[1]]; PINCH={d:dist(a.x,a.y,b.x,b.y), z:CAM.z, mx:(a.x+b.x)/2, my:(a.y+b.y)/2}; DRAGBOX=null; DRAGMOVE=null; ids.forEach(function(id){ PTR[id].pan=true; PTR[id].driving=false; }); } });
  c.addEventListener('pointermove', function(e){
    var w=screenToWorld(e.clientX,e.clientY);
    if (GHOST && e.pointerType==='mouse'){ var d=BLD[GHOST.type]; GHOST.tx=Math.floor(w[0]/T-d.w/2+0.5); GHOST.ty=Math.floor(w[1]/T-d.h/2+0.5); }
    if (TARGETING){ TARGETING.mx=w[0]; TARGETING.my=w[1]; }
    if (e.pointerType==='mouse') HOVER=pick(w[0],w[1],4);
    var p=PTR[e.pointerId]; if (!p) return;
    var dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    var travel=Math.abs(p.x-p.x0)+Math.abs(p.y-p.y0);
    if (travel>(p.type==='mouse'?8:24)) p.moved=true;
    var ids=Object.keys(PTR);
    if (ids.length>=2 && PINCH){ var a=PTR[ids[0]], b=PTR[ids[1]], nd=dist(a.x,a.y,b.x,b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      var before=screenToWorld(mx,my); CAM.z=clamp(PINCH.z*nd/PINCH.d, 0.25, 2.5); var after=screenToWorld(mx,my); CAM.x+=before[0]-after[0]; CAM.y+=before[1]-after[1];
      CAM.x-=(mx-PINCH.mx)/CAM.z; CAM.y-=(my-PINCH.my)/CAM.z; PINCH.mx=mx; PINCH.my=my; clampCam(); return; }
    if (GHOST && p.type!=='mouse'){ var d2=BLD[GHOST.type]; GHOST.tx=Math.floor(w[0]/T-d2.w/2+0.5); GHOST.ty=Math.floor(w[1]/T-d2.h/2+0.5); return; }
    if (TARGETING && p.type!=='mouse') return;
    if (!p.moved) return;
    var boxing = (p.type==='mouse' && p.btn===0) || (p.type!=='mouse' && UI.boxMode);
    if (boxing && !GHOST){ DRAGBOX={x0:p.x0,y0:p.y0,x1:p.x,y1:p.y}; return; }
    /* Telefonda seçili birliği parmakla yürüt; kutu seçim yalnızca ⬚ açıkken */
    if (p.type!=='mouse' && !p.pan && !UI.boxMode && !GHOST && !TARGETING){
      if (p.grab && p.grab.k==='u' && p.grab.team===ME && SEL.indexOf(p.grab)<0) SEL=[p.grab];
      var units=ownMobileUnits();
      if (units.length){
        p.driving=true; DRAGMOVE={x:w[0],y:w[1]};
        var now=Date.now(); if (!p.lastCmd || now-p.lastCmd>90){ p.lastCmd=now; orderMove(units, w[0], w[1], false); }
        return;
      }
    }
    CAM.x-=dx/CAM.z; CAM.y-=dy/CAM.z; clampCam();
  });
  function up(e){
    var p=PTR[e.pointerId]; delete PTR[e.pointerId]; if (!p) return;
    if (PINCH){ if (Object.keys(PTR).length<2) PINCH=null; DRAGMOVE=null; return; }
    var w=screenToWorld(e.clientX,e.clientY);
    var travel=Math.abs(e.clientX-p.x0)+Math.abs(e.clientY-p.y0);
    var tapSlop=p.type==='mouse'?8:30;
    if (DRAGBOX && (Math.abs(DRAGBOX.x1-DRAGBOX.x0)+Math.abs(DRAGBOX.y1-DRAGBOX.y0)>12)){ boxSelect(DRAGBOX, e.shiftKey); DRAGBOX=null; DRAGMOVE=null; return; }
    DRAGBOX=null;
    if (p.driving){ DRAGMOVE=null; command(w[0],w[1]); return; }
    DRAGMOVE=null;
    if (p.type==='mouse' && p.btn===2){
      if (travel>tapSlop) return;
      if (GHOST || TARGETING){ cancelModes(); return; }
      if (SEL.some(function(s){return s.team===ME;})) command(w[0],w[1]); return; }
    if (p.type==='mouse' && p.btn!==0) return;
    if (GHOST && p.type!=='mouse' && travel>tapSlop) return;
    if (travel<=tapSlop || (TARGETING && p.type!=='mouse')) tap(w[0],w[1], p.type, e.shiftKey);
  }
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', function(e){ delete PTR[e.pointerId]; PINCH=null; DRAGBOX=null; DRAGMOVE=null; });
  c.addEventListener('wheel', function(e){ e.preventDefault(); var before=screenToWorld(e.clientX,e.clientY); CAM.z=clamp(CAM.z*(e.deltaY<0?1.12:1/1.12),0.25,2.5); var after=screenToWorld(e.clientX,e.clientY); CAM.x+=before[0]-after[0]; CAM.y+=before[1]-after[1]; clampCam(); }, {passive:false});
  addEventListener('keydown', function(e){ UI.keys[e.key.toLowerCase()]=true;
    if (e.key==='Escape'){ if (GHOST||TARGETING) cancelModes(); else if (!$('menu').classList.contains('hide')) { if (G && !G.over) resume(); } else showMenu(); }
    if (e.key===' ') { var b=nearestOwnB('yard'); if (b) centerOn(b.x,b.y); }
    if (e.key.toLowerCase()==='h' && e.ctrlKey===false){ /* hold */ }
    if (e.key.toLowerCase()==='a' && e.ctrlKey){ e.preventDefault(); selectArmy(); }
    if (e.key>='1'&&e.key<='9' && e.ctrlKey){ e.preventDefault(); UI['grp'+e.key]=SEL.slice(); uiMsg('Grup '+e.key+' kaydedildi'); }
    else if (e.key>='1'&&e.key<='9' && UI['grp'+e.key]){ SEL=UI['grp'+e.key].filter(function(s){return !s.dead;}); }
  });
  addEventListener('keyup', function(e){ UI.keys[e.key.toLowerCase()]=false; });
  var mm=$('mini'), mmDown=false;
  mm.addEventListener('pointerdown', function(e){ e.stopPropagation(); mmDown=true; mm.setPointerCapture(e.pointerId); var p=minimapPoint(e); if (e.button===2 && SEL.length) command(p[0],p[1]); else centerOn(p[0],p[1]); });
  mm.addEventListener('pointermove', function(e){ if (mmDown){ var p=minimapPoint(e); centerOn(p[0],p[1]); } });
  mm.addEventListener('pointerup', function(){ mmDown=false; }); mm.addEventListener('contextmenu', function(e){ e.preventDefault(); });
}
function nearestOwnB(type){ for (var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if (e.k==='b'&&e.team===ME&&e.type===type) return e; } return null; }
function cancelModes(){ GHOST=null; TARGETING=null; showPlaceBar(false); }
function boxSelect(b, add){
  var a=screenToWorld(Math.min(b.x0,b.x1),Math.min(b.y0,b.y1)), c=screenToWorld(Math.max(b.x0,b.x1),Math.max(b.y0,b.y1));
  var s=G.ents.filter(function(e){ return e.k==='u' && e.team===ME && e.x>=a[0] && e.x<=c[0] && e.y-(e.z||0)>=a[1] && e.y-(e.z||0)<=c[1]; });
  var army=s.filter(function(u){ return !UNT[u.type].harvest; }); if (army.length) s=army;
  SEL = add ? SEL.concat(s.filter(function(x){return SEL.indexOf(x)<0;})) : s; if (s.length) sfx('click');
  UI.boxMode=false; var bb=$('boxBtn'); if (bb) bb.classList.remove('on');
}
function selectArmy(){ SEL=G.ents.filter(function(e){ return e.k==='u'&&e.team===ME&&UNT[e.type].wpn; }); uiMsg(SEL.length+' savaş birliği seçildi'); }
function tap(wx, wy, ptype, shift){
  var tx=Math.floor(wx/T), ty=Math.floor(wy/T);
  if (GHOST){ var d=BLD[GHOST.type], ntx=Math.floor(wx/T-d.w/2+0.5), nty=Math.floor(wy/T-d.h/2+0.5);
    if (ptype==='mouse' || (GHOST.tx===ntx && GHOST.ty===nty)) { GHOST.tx=ntx; GHOST.ty=nty; placeGhost(); }
    else { GHOST.tx=ntx; GHOST.ty=nty; }
    return; }
  if (TARGETING){ var k=TARGETING.kind, units=SEL.filter(function(s){return s.k==='u'&&s.team===ME;});
    if (k==='amove') orderMove(units, wx, wy, true);
    if (k==='rally'){ TARGETING.b.rally=[wx,wy]; }
    if (k==='ion'){ fireIon(ME,wx,wy); }
    if (k==='agent'){ var t=pick(wx,wy,12); if (t && t.team!==ME && !(t.k==='u'&&UNT[t.type].horde)){ orderCapture(units,t); uiMsg('Ajan görevi verildi: '+defOf(t).ad,'good'); } else { uiMsg('Bir düşman ya da tarafsız yapı/araç seç','bad'); return; } }
    TARGETING=null; sfx('ready'); return; }
  var e=pick(wx,wy, ptype==='mouse'?4:14);
  var mine=SEL.filter(function(s){ return s.team===ME && s.k==='u'; });
  if (e && e.team===ME){
    var now=Date.now();
    if (UI.lastTapEnt && UI.lastTapEnt.type===e.type && now-UI.lastTap<350){ // çift dokunma: ekrandaki aynı tür
      var a=screenToWorld(0,0), c=screenToWorld(VIEW.w,VIEW.h); SEL=G.ents.filter(function(x){ return x.team===ME && x.type===e.type && x.x>a[0]&&x.x<c[0]&&x.y>a[1]&&x.y<c[1]; }); }
    else if (shift){ var i=SEL.indexOf(e); if (i>=0) SEL.splice(i,1); else SEL.push(e); }
    else if (mine.length && e.k==='b' && e.type==='refinery' && mine.some(function(u){return UNT[u.type].harvest;})) { mine.forEach(function(u){ if(UNT[u.type].harvest){ u.ord={k:'harvest'}; u.hs='ret'; u.path=null; } }); }
    else SEL=[e];
    UI.lastTap=now; UI.lastTapEnt=e; sfx('click'); return; }
  if (mine.length){ command(wx,wy); return; }
  if (e){ SEL=[e]; return; }
  // seçili kendi yapısı varsa: toplanma noktası
  if (SEL.length===1 && SEL[0].k==='b' && SEL[0].team===ME && BLD[SEL[0].type].makes){ SEL[0].rally=[wx,wy]; uiMsg('Toplanma noktası ayarlandı'); return; }
  SEL=[];
}
function command(wx, wy){
  var units=SEL.filter(function(s){ return s.k==='u' && s.team===ME; }); if (!units.length) return;
  var t=pick(wx,wy,12), tx=Math.floor(wx/T), ty=Math.floor(wy/T);
  if (t && t.team!==ME){
    var agents=units.filter(function(u){return UNT[u.type].capture;}), fighters=units.filter(function(u){return !UNT[u.type].capture && UNT[u.type].wpn;});
    if (t.team===2){ if (agents.length) orderCapture(agents,t); else orderMove(units,wx,wy); }
    else { if (agents.length) orderCapture(agents,t); if (fighters.length) orderAttack(fighters,t); var rest=units.filter(function(u){ return !UNT[u.type].capture && !UNT[u.type].wpn; }); if (rest.length) orderMove(rest,wx,wy); }
    fxRing(t.x,t.y,'#f55',24); sfx('ready'); return; }
  var harv=units.filter(function(u){return UNT[u.type].harvest;});
  if (inMap(tx,ty) && MAP.cry[idx(tx,ty)] && harv.length){ orderHarvest(harv,tx,ty); units=units.filter(function(u){return harv.indexOf(u)<0;}); }
  var workers=units.filter(function(u){return UNT[u.type].gather;});
  if (inMap(tx,ty) && workers.length){ var dc=MAP.deco[idx(tx,ty)]; if (dc && (isTree(dc)||isStone(dc))){ orderGather(workers,tx,ty); units=units.filter(function(u){return workers.indexOf(u)<0;}); } }
  var li=lootAt(wx,wy); if (li>=0){ var inf=units.filter(function(u){return UNT[u.type].armor==='pi';}); if (inf.length){ orderLoot([inf[0]],li); units=units.filter(function(u){return u!==inf[0];}); } }
  var m=meteorAt(wx,wy); if (m){ var sc=units.filter(function(u){return UNT[u.type].science;}); if (sc.length){ orderStudy(sc,m); units=units.filter(function(u){return sc.indexOf(u)<0;}); } }
  if (units.length) orderMove(units, wx, wy, false);
  fxRing(wx,wy,'#8f8',14); sfx('click');
}
function placeGhost(){
  if (!GHOST || GHOST.tx==null) return;
  var ok;
  if (GHOST.recipe){ ok=placeCrafted(ME, GHOST.recipe, GHOST.tx, GHOST.ty); if (ok){ sfx('build'); if (!canCraft(ME,GHOST.recipe)) cancelModes(); } else uiMsg('Buraya konamaz','bad'); return; }
  ok=tryPlace(ME, GHOST.cat, GHOST.tx, GHOST.ty);
  if (ok){ var wasWall=BLD[GHOST.type].wall; sfx('build');
    if (wasWall && !queue(ME,GHOST.type)) { /* duvar dizmeye devam */ var tm=teamOf(ME); var q=tm.q.savunma; q[q.length-1].p=1; tm.q.savunma.shift(); tm.ready.savunma=GHOST.type; }
    else cancelModes(); updateSidebar(); }
  else uiMsg('Buraya kurulamaz (kendi yapılarına yakın ve boş zemin gerekli)','bad');
}
function showPlaceBar(on){
  var bar=$('placebar'); if (bar) bar.classList.toggle('hide', !on);
  if (on && (document.documentElement.classList.contains('mob') || (typeof isNarrow==='function' && isNarrow()))){
    if (typeof closeDrawers==='function') closeDrawers();
    else {
      document.documentElement.classList.add('side-shut','cmd-shut');
      document.documentElement.classList.remove('side-open','cmd-open');
      if (typeof syncDrawerButtons==='function') syncDrawerButtons();
    }
  }
}
