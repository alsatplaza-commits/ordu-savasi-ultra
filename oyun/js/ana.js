/* ORDU SAVAŞI: KOMUTA — ana döngü, menü, ayarlar, donanıma göre otomatik kurulum */
var LOOP={last:0, acc:0, fps:60, fpsT:0, fpsN:0, uiT:0, saveT:0};
var SETTINGS={quality:'auto', vol:0.8, mvol:0.35, size:224, diff:1, edge:true};
function loadSettings(){ try{ var s=JSON.parse(localStorage.getItem('ordu-savasi-ultra:ayar')||'{}'); for (var k in s) SETTINGS[k]=s[k]; }catch(e){} }
function storeSettings(){ try{ localStorage.setItem('ordu-savasi-ultra:ayar', JSON.stringify(SETTINGS)); }catch(e){} }

/* Donanıma göre otomatik ayar: dünya hiçbir zaman küçültülmez, sadece efekt yoğunluğu ve çözünürlük ayarlanır */
function detectHardware(){
  var cores=navigator.hardwareConcurrency||4, mem=navigator.deviceMemory||4, mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  var gpu='?'; try{ var c=document.createElement('canvas'), gl=c.getContext('webgl'); var ext=gl&&gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl?'WebGL':'yok'); }catch(e){}
  var score = cores*1.2 + mem*1.5 + (mobile?0:6) + (/RTX|Radeon RX|Arc|Apple M/i.test(gpu)?6:0);
  var tier = score>22 ? 'yuksek' : score>13 ? 'orta' : 'dusuk';
  return {cores:cores, mem:mem, mobile:mobile, gpu:gpu, tier:tier};
}
function applyQuality(){
  var hw=detectHardware(), q = SETTINGS.quality==='auto' ? hw.tier : SETTINGS.quality;
  var T2={dusuk:{dpr:1, parts:0.45, fauna:0.4, lights:true, weather:true, chunks:40}, orta:{dpr:1.5, parts:0.75, fauna:0.75, lights:true, weather:true, chunks:64}, yuksek:{dpr:2, parts:1, fauna:1, lights:true, weather:true, chunks:110}}[q];
  QUALITY.dpr=T2.dpr; QUALITY.parts=T2.parts; QUALITY.fauna=T2.fauna; QUALITY.lights=T2.lights; QUALITY.weather=T2.weather; FXQ=T2.parts; CHUNK_MAX=T2.chunks;
  UI.hw=hw; UI.q=q; if (CV) resize();
  var el=$('hwInfo'); if (el) el.textContent='Cihaz: '+hw.cores+' çekirdek, ~'+hw.mem+' GB bellek, '+(hw.mobile?'mobil':'bilgisayar')+' • Grafik: '+(''+hw.gpu).slice(0,48)+' → Kalite: '+({dusuk:'Hafif',orta:'Orta',yuksek:'Yüksek'}[q]);
}

function frame(ts){
  requestAnimationFrame(frame);
  var dt=Math.min(0.1,(ts-LOOP.last)/1000||0); LOOP.last=ts;
  if (!G) return;
  LOOP.fpsN++; LOOP.fpsT+=dt; if (LOOP.fpsT>1){ LOOP.fps=LOOP.fpsN/LOOP.fpsT; LOOP.fpsN=0; LOOP.fpsT=0; $('fps').textContent=Math.round(LOOP.fps)+' fps • '+G.ents.length+' varlık'; }
  if (!UI.paused){
    LOOP.acc += dt*UI.speed; var n=0;
    while (LOOP.acc>=DT && n<8){ step(DT); LOOP.acc-=DT; n++; }
    if (n>=8) LOOP.acc=0;
    updateFX(dt*UI.speed);
    // klavye / kenar kaydırma
    var sp=900*dt/CAM.z, k=UI.keys;
    if (k['w']||k['arrowup']) CAM.y-=sp; if (k['s']||k['arrowdown']) CAM.y+=sp; if (k['a']||k['arrowleft']) CAM.x-=sp; if (k['d']||k['arrowright']) CAM.x+=sp;
    if (SETTINGS.edge && UI.mouse && document.hasFocus()){ var m=UI.mouse, e=12; if (m.x<e) CAM.x-=sp; if (m.x>VIEW.w-e) CAM.x+=sp; if (m.y<e) CAM.y-=sp; if (m.y>VIEW.h-e) CAM.y+=sp; }
    clampCam();
    LOOP.saveT+=dt; if (LOOP.saveT>90){ LOOP.saveT=0; saveGame(true); }
  }
  render(UI.paused?0:dt*UI.speed);
  LOOP.uiT+=dt; if (LOOP.uiT>0.25){ LOOP.uiT=0; updateTopBar(); updateSidebar(); updateSelPanel(); drawMinimap(); if (!$('devlet').classList.contains('hide')) renderDevlet(); }
}

/* ---------- menü ---------- */
function showMenu(){ UI.paused=true; $('menu').classList.remove('hide'); loadSaved().then(function(s){ $('mContinue').disabled=!(G&&!G.over) && !s; $('mContinue').dataset.has = s?'1':''; }); playMusic('m_menu_sefer'); }
function resume(){ $('menu').classList.add('hide'); UI.paused=false; audioInit(); playMusic(G.season===1?'m_col_firtinasi':'m_ova_marsi'); }
function startNew(){
  audioInit();
  var diff=+$('optDiff').value, size=+$('optSize').value; SETTINGS.diff=diff; SETTINGS.size=size; storeSettings();
  $('loading').classList.remove('hide');
  setTimeout(function(){
    newGame({size:size, diff:diff}); afterLoad();
    var b=BASES[ME]; CAM.z = UI.hw&&UI.hw.mobile?0.9:1; centerOn(b.x*T,b.y*T);
    $('loading').classList.add('hide'); resume();
    uiMsg('Komutan, hoş geldin! Önce 🏗 Enerji Santrali, sonra Rafineri kur.','good');
    setTimeout(function(){ uiMsg('İpucu: Askere dokun, sonra yere dokun ya da parmağını sürükle — oraya gider.'); }, 4500);
    setTimeout(function(){ uiMsg('İşçilerle odun ve taş topla, 🔨 Zanaat sekmesinde eşya üret. Geceleri mutant sürüleri gelir!'); }, 10000);
    saveGame(true);
  }, 60);
}
function continueGame(){
  if (G && !G.over && !$('mContinue').dataset.fresh){ resume(); return; }
  loadSaved().then(function(o){ if (!o){ uiMsg('Kayıt bulunamadı','bad'); return; } try { deserialize(o); afterLoad(); resume(); uiMsg('Kayıt yüklendi: '+G.day+'. gün','good'); } catch(e){ alert('Kayıt açılamadı: '+e.message); } });
}
function afterLoad(){ invalidateChunks(); resetFog(); UI.mmBase=null; SEL=[]; GHOST=null; TARGETING=null; FAUNA_LIVE.length=0; $('over').classList.add('hide'); $('mContinue').dataset.fresh=''; buildSidebar(); updateVision(); }

/* ---------- devlet / toplum paneli ---------- */
function renderDevlet(){
  var tm=teamOf(ME), s=tm.soc, h='';
  h+='<div class="row"><b>Halkın morali:</b> <div class="bar"><i style="width:'+s.moral+'%;background:'+(s.moral>60?'#4e4':s.moral>30?'#fc3':'#f44')+'"></i></div> '+Math.round(s.moral)+'%</div>';
  h+='<div class="hint">Moral yüksekse üretim hızlanır ve askerler daha iyi vurur. Düşükse askerler firar edebilir.</div>';
  h+='<h3>Yasalar</h3>';
  for (var k in LAWS){ var L=LAWS[k]; h+='<div class="row"><b>'+L.ad+':</b> '+L.secenek.map(function(o,i){ return '<button class="law'+(s.laws[k]===i?' on':'')+'" data-k="'+k+'" data-i="'+i+'">'+o.ad+'</button>'; }).join('')+'</div>'; }
  h+='<h3>Klanlar ve aileler</h3>';
  CLANS.forEach(function(c,i){ var cs=s.clans[i]; h+='<div class="row clan"><span style="color:'+c.renk+'">'+c.ikon+' '+c.ad+'</span> • Üye '+cs.uye+' • Kayıp '+cs.kayip+' • Sadakat <div class="bar sm"><i style="width:'+cs.sadakat+'%"></i></div><div class="hint">'+c.bilgi+'</div></div>'; });
  var people=G.ents.filter(function(e){ return e.team===ME && e.p; }).sort(function(a,b){ return b.kills-a.kills; }).slice(0,8);
  if (people.length){ h+='<h3>Öne çıkan kişiler</h3>'; people.forEach(function(e){ h+='<div class="row">'+(e.p.kadin?'👩':'👨')+' '+personTitle(e.p)+' — '+UNT[e.type].ad+' • '+CLANS[e.p.klan].ikon+' • '+e.kills+' düşman'+(e.vet?' '+'★'.repeat(e.vet):'')+'</div>'; }); }
  h+='<h3>Kasabalar</h3>';
  G.towns.forEach(function(tw){ h+='<div class="row">🏘 '+tw.ad+' • Nüfus '+tw.pop+' • Bize destek <div class="bar sm"><i style="width:'+tw.loy[ME]+'%"></i></div> '+Math.round(tw.loy[ME])+'%'+(tw.loy[ME]>60?' (vergi veriyor)':'')+'</div>'; });
  h+='<div class="hint">Kasabaları mutant sürülerinden koru: orada öldürdüğün her mutant halkın desteğini artırır.</div>';
  h+='<h3>Bilim</h3><div class="row">Bilim puanı: '+Math.floor(tm.sci)+'</div>';
  DISCOVERIES.forEach(function(D){ h+='<div class="row">'+(tm.disc[D.k]?'✅':'⬜')+' '+D.ad+' ('+D.puan+' puan) — '+D.bilgi+'</div>'; });
  h+='<h3>Envanter</h3><div class="row">'+Object.keys(MATS).map(function(m){ return MATS[m].ikon+' '+MATS[m].ad+': '+Math.floor(tm.mat[m]); }).join(' • ')+'</div><div class="row">⛑ Sağlık kiti: '+tm.items.medkit+' • 💣 Mayın: '+tm.items.mine+' • 💾 Kuantum İşlemci: '+tm.items.cpu+'</div>';
  h+='<h3>İstatistik</h3><div class="row">Öldürülen düşman: '+tm.killed+' • Kayıp: '+tm.lost+' • Şehit: '+s.olen+'</div>';
  var box=$('devletBody'); if (box._h!==h){ box.innerHTML=h; box._h=h; box.querySelectorAll('.law').forEach(function(b){ b.onclick=function(){ s.laws[b.dataset.k]=+b.dataset.i; sfx('click'); renderDevlet(); }; }); }
}

/* ---------- açılış ---------- */
function boot(){
  applyPhoneChrome();
  loadSettings(); applyQuality();
  initRender($('game')); setupInput();
  addEventListener('resize', function(){ applyPhoneChrome(); resize(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', function(){ resize(); });
  addEventListener('orientationchange', function(){ setTimeout(function(){ applyPhoneChrome(); resize(); }, 280); });
  addEventListener('mousemove', function(e){ UI.mouse={x:e.clientX,y:e.clientY}; });
  addEventListener('mouseout', function(e){ if (!e.relatedTarget) UI.mouse=null; });
  $('mNew').onclick=function(){ $('newOpts').classList.toggle('hide'); };
  $('mStart').onclick=startNew;
  $('mContinue').onclick=continueGame;
  $('mExport').onclick=function(){ if (!G){ loadSaved().then(function(o){ if(o){ deserialize(o); afterLoad(); exportSave(); } else uiMsg('Önce bir oyun başlat','bad'); }); } else exportSave(); };
  $('mImport').onclick=function(){ importSave(function(ok){ if (ok){ afterLoad(); resume(); uiMsg('Kayıt dosyası yüklendi','good'); } }); };
  $('mHelp').onclick=function(){ $('help').classList.remove('hide'); };
  $('helpClose').onclick=function(){ $('help').classList.add('hide'); };
  $('mSettings').onclick=function(){ $('settings').classList.remove('hide'); };
  $('setClose').onclick=function(){ $('settings').classList.add('hide'); };
  $('optQ').value=SETTINGS.quality; $('optQ').onchange=function(){ SETTINGS.quality=this.value; storeSettings(); applyQuality(); invalidateChunks(); };
  $('optVol').value=SETTINGS.vol; $('optVol').oninput=function(){ SETTINGS.vol=+this.value; setVolumes(SETTINGS.vol,SETTINGS.mvol); storeSettings(); };
  $('optMus').value=SETTINGS.mvol; $('optMus').oninput=function(){ SETTINGS.mvol=+this.value; setVolumes(SETTINGS.vol,SETTINGS.mvol); storeSettings(); };
  $('optEdge').checked=SETTINGS.edge; $('optEdge').onchange=function(){ SETTINGS.edge=this.checked; storeSettings(); };
  $('optDiff').value=SETTINGS.diff; $('optSize').value=SETTINGS.size;
  // Silme: sadece ayarlarda, iki aşamalı onay + yazarak onay
  $('wipeBtn').onclick=function(){ $('wipeBox').classList.remove('hide'); $('wipeInput').value=''; };
  $('wipeCancel').onclick=function(){ $('wipeBox').classList.add('hide'); };
  $('wipeGo').onclick=function(){ if ($('wipeInput').value.trim().toUpperCase()!=='SIL'){ alert('Silmek için kutuya SIL yaz.'); return; } wipeAllData().then(function(){ alert('Tüm kayıtlar ve indirilen paketler silindi.'); location.reload(); }); };
  function packUi(){ var on=PACKS.has('hd'); $('packHdBtn').textContent= on?'✔ Yüklü (denetle)':'⬇ Yükle'; $('packHdDel').classList.toggle('hide',!on); $('packInfo').textContent=PACKS.status(); }
  packUi();
  $('packHdBtn').onclick=function(){ var st=$('packHdState'); st.textContent='Bağlanılıyor…'; PACKS.install('hd', function(p,f){ st.textContent='İndiriliyor %'+Math.round(p*100)+' — '+f; }).then(function(m){ st.textContent='Tamam: '+m.files.length+' dosya doğrulandı (imza + SHA-256).'; packUi(); SND.musicName=null; }).catch(function(e){ st.textContent='Hata: '+(e.message||e); }); };
  $('packHdDel').onclick=function(){ if (confirmTwice('packdel','Kaldırmak için tekrar bas')) PACKS.remove('hd').then(function(){ $('packHdState').textContent='Paket kaldırıldı.'; packUi(); }); };
  $('menuBtn').onclick=function(){ saveGame(true); showMenu(); };
  $('saveBtn').onclick=function(){ saveGame(false); };
  $('devletBtn').onclick=function(){ $('devlet').classList.toggle('hide'); renderDevlet(); };
  $('devletClose').onclick=function(){ $('devlet').classList.add('hide'); };
  $('logBtn').onclick=function(){ $('log').classList.toggle('hide'); };
  $('speedBtn').onclick=function(){ UI.speed = UI.speed===1?2:UI.speed===2?3:UI.speed===3?0.5:1; this.textContent='⏩ '+UI.speed+'×'; };
  $('boxBtn').onclick=function(){ UI.boxMode=!UI.boxMode; this.classList.toggle('on',UI.boxMode); uiMsg(UI.boxMode ? 'Kutu seçim açık (isteğe bağlı). Kapatmak için ⬚' : 'Kutu seçim kapalı. Askere dokun, sürükleyerek yürüt.'); };
  $('armyBtn').onclick=selectArmy;
  $('baseBtn').onclick=function(){ var b=nearestOwnB('yard'); if (b) centerOn(b.x,b.y); };
  $('deselBtn').onclick=function(){ SEL=[]; cancelModes(); var sp=$('selp'); if (sp) sp.classList.remove('open'); if (document.documentElement.classList.contains('mob')){ document.documentElement.classList.add('side-shut','cmd-shut'); syncDrawerButtons(); } };
  $('swBtn').onclick=function(){ if (teamOf(ME).sw>=BLD.uplink.sw){ TARGETING={kind:'ion'}; uiMsg('İyon Topu: hedefe dokun'); } else uiMsg('İyon Topu henüz dolmadı'); };
  $('placeOk').onclick=function(){ placeGhost(); };
  $('placeNo').onclick=function(){ cancelModes(); if (document.documentElement.classList.contains('mob')){ document.documentElement.classList.add('side-shut'); syncDrawerButtons(); } };
  bindToggle($('buildBtn'), 'side-shut');
  bindToggle($('cmdBtn'), 'cmd-shut');
  bindShut($('sideClose'), 'side-shut');
  bindShut($('cmdClose'), 'cmd-shut');
  $('selp').addEventListener('pointerup', function(ev){ if (!document.documentElement.classList.contains('mob')) return; if (ev.target.closest && ev.target.closest('button')) return; $('selp').classList.toggle('open'); });
  document.addEventListener('pointerdown', maybeAutoFs, true);
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  var fsLock=0;
  function onFsTap(ev){ if (ev){ ev.preventDefault(); ev.stopPropagation(); } var now=Date.now(); if (now-fsLock<400) return; fsLock=now; toggleImmersive(); }
  $('fsBtn').addEventListener('pointerup', onFsTap);
  $('fsBtn').addEventListener('click', onFsTap);
  $('overEndless').onclick=function(){ G.endless=true; G.over=null; G.ai[1].respawnAt=G.t+30; $('over').classList.add('hide'); resume(); uiMsg('Sonsuz savaş başladı. Dünya seni bekliyor, Komutan.','good'); };
  $('overMenu').onclick=function(){ $('over').classList.add('hide'); showMenu(); };
  function onAppHide(){ if (typeof audioSetBackground==='function') audioSetBackground(true); if (G && !UI.paused){ try{ saveGame(true); }catch(err){} } }
  function onAppShow(){ if (document.hidden || document.visibilityState==='hidden') return; if (typeof audioSetBackground==='function') audioSetBackground(false); }
  addEventListener('pagehide', onAppHide);
  addEventListener('pageshow', onAppShow);
  document.addEventListener('visibilitychange', function(){ if (document.hidden) onAppHide(); else onAppShow(); });
  addEventListener('blur', function(){ setTimeout(function(){ if (document.hidden || document.visibilityState==='hidden' || !document.hasFocus()){ if (typeof audioSetBackground==='function') audioSetBackground(true); } }, 250); });
  addEventListener('focus', function(){ if (!document.hidden) onAppShow(); });
  var pk = window.PACKS ? PACKS.status() : null; if ($('packInfo') && pk) $('packInfo').textContent=pk;
  showMenu();
  requestAnimationFrame(frame);
}
function inFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function requestImmersive(){
  var el=document.documentElement, ret;
  try {
    if (el.requestFullscreen) ret=el.requestFullscreen({navigationUI:'hide'});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch(e){ try { if (el.requestFullscreen) ret=el.requestFullscreen(); } catch(e2){} }
  if (ret && ret.catch) ret.catch(function(){});
}
function toggleImmersive(){
  if (inFullscreen()){ var ex=document.exitFullscreen||document.webkitExitFullscreen; if (ex){ var r=ex.call(document); if (r&&r.catch) r.catch(function(){}); } }
  else requestImmersive();
}
function syncFs(){ document.documentElement.classList.toggle('is-fs', inFullscreen()); var b=$('fsBtn'); if (b) b.classList.toggle('on', inFullscreen()); if (typeof resize==='function') resize(); }
var fsTries=0;
function maybeAutoFs(){
  if (!document.documentElement.classList.contains('mob')) return;
  if (inFullscreen() || fsTries>=3) return;
  fsTries++;
  requestImmersive();
}
window.addEventListener('DOMContentLoaded', boot);
