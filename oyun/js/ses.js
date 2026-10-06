/* ORDU SAVAŞI: KOMUTA — ses: gerçek ses paketleri (ses/*.js) + yedek sentez */
var SND = { ctx:null, buf:{}, master:null, music:null, musicGain:null, vol:0.8, mvol:0.4, last:{}, loaded:false, bgHidden:false };
window.ORDU_PAK = function(name, mime, b64){ SND.pending = SND.pending||{}; SND.pending[name]={mime:mime,b64:b64}; if (SND.ctx) decodePak(name); };
function decodePak(name){
  var p=SND.pending[name]; if(!p) return; delete SND.pending[name];
  try { var bin=atob(p.b64), arr=new Uint8Array(bin.length); for (var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    SND.ctx.decodeAudioData(arr.buffer, function(b){ SND.buf[name]=b; if (name.indexOf('m_')===0 && SND.wantMusic===name) playMusic(name); }, function(){}); } catch(e){}
}
function audioHidden(){ return !!(SND.bgHidden || document.hidden || document.visibilityState==='hidden'); }
function audioSetBackground(hidden){
  if (!hidden && (document.hidden || document.visibilityState==='hidden')) return;
  SND.bgHidden = !!hidden;
  if (!SND.ctx) return;
  var now=SND.ctx.currentTime;
  if (hidden){
    try {
      if (SND.musicGain){ SND.musicGain.gain.cancelScheduledValues(now); SND.musicGain.gain.setValueAtTime(0, now); }
      if (SND.master){ SND.master.gain.cancelScheduledValues(now); SND.master.gain.setValueAtTime(0, now); }
    } catch(e){ if (SND.musicGain) SND.musicGain.gain.value=0; if (SND.master) SND.master.gain.value=0; }
    if (SND.ctx.state==='running'){ var p=SND.ctx.suspend(); if (p&&p.catch) p.catch(function(){}); }
    return;
  }
  if (document.hidden || document.visibilityState==='hidden') return;
  try {
    if (SND.musicGain){ SND.musicGain.gain.cancelScheduledValues(now); SND.musicGain.gain.setValueAtTime(SND.mvol, now); }
    if (SND.master){ SND.master.gain.cancelScheduledValues(now); SND.master.gain.setValueAtTime(SND.vol, now); }
  } catch(e2){ if (SND.musicGain) SND.musicGain.gain.value=SND.mvol; if (SND.master) SND.master.gain.value=SND.vol; }
  if (SND.ctx.state==='suspended'){ var q=SND.ctx.resume(); if (q&&q.catch) q.catch(function(){}); }
  if (SND.wantMusic && (!SND.music || SND.musicName!==SND.wantMusic)) playMusic(SND.wantMusic);
}
function audioInit(){
  if (SND.ctx) { if (audioHidden()) return; if (SND.ctx.state==='suspended'){ var r=SND.ctx.resume(); if (r&&r.catch) r.catch(function(){}); } return; }
  try { SND.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ return; }
  SND.master=SND.ctx.createGain(); SND.master.gain.value=SND.vol; SND.master.connect(SND.ctx.destination);
  SND.musicGain=SND.ctx.createGain(); SND.musicGain.gain.value=SND.mvol; SND.musicGain.connect(SND.ctx.destination);
  for (var k in (SND.pending||{})) decodePak(k);
  if (!SND.loaded){ SND.loaded=true; setInterval(musicDirector, 3000); var list=['a_tufek','a_makineli','a_tank_atis','a_roket','a_patlama1','a_patlama2','a_patlama3','a_uretim','a_onay','a_uyari','a_tik','a_zafer','a_yenilgi','a_metal','a_heli'];
    list.forEach(function(n){ loadScript('ses/'+n+'.js'); }); }
}
function loadScript(src){ var s=document.createElement('script'); s.src=src; s.async=true; document.head.appendChild(s); }
var BUNDLED_MUSIC={m_menu_sefer:1, m_ova_marsi:1, m_col_firtinasi:1};
function fetchAudio(name, dir){
  if (BUNDLED_MUSIC[name]) return fetch('muzik/'+name+'.ogg').then(function(r){ if(!r.ok) throw 0; return r.arrayBuffer(); });
  return PACKS.get('hd', dir+'/'+name+'.ogg').then(function(b){ if(!b) throw 0; return b; });
}
function getBuf(name, dir){
  if (SND.buf[name]) return Promise.resolve(SND.buf[name]);
  if (SND['req_'+name]) return SND['req_'+name];
  SND['req_'+name] = fetchAudio(name, dir||'muzik').then(function(ab){ return new Promise(function(res,rej){ SND.ctx.decodeAudioData(ab, function(b){ SND.buf[name]=b; res(b); }, rej); }); }).catch(function(){ SND['req_'+name]=null; return null; });
  return SND['req_'+name];
}
function playMusic(name){
  SND.wantMusic=name; if (!SND.ctx || audioHidden()) return;
  if (!BUNDLED_MUSIC[name] && !PACKS.has('hd')) name = SND.wantMusic = (name==='m_gece_baskini'||name==='m_kar_cephesi') ? 'm_col_firtinasi' : 'm_ova_marsi';
  if (SND.musicName===name && SND.music) return;
  getBuf(name).then(function(b){ if (!b || SND.wantMusic!==name) return;
    if (SND.music){ var old=SND.music, og=SND.musicNode; try{ og.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.8); setTimeout(function(){ try{old.stop();}catch(e){} }, 3000); }catch(e){} }
    var g=SND.ctx.createGain(); g.gain.value=0; g.connect(SND.musicGain); g.gain.setTargetAtTime(1, SND.ctx.currentTime, 1);
    var s=SND.ctx.createBufferSource(); s.buffer=b; s.loop=true; s.connect(g); s.start(); SND.music=s; SND.musicNode=g; SND.musicName=name; });
}
/* ortam sesi (HD paket): gece, yağmur, rüzgar, savaş */
function playAmbience(name){
  if (!SND.ctx || !PACKS.has('hd') || SND.ambName===name) return; SND.ambName=name;
  if (SND.amb){ var o=SND.amb, og=SND.ambNode; og.gain.setTargetAtTime(0,SND.ctx.currentTime,0.6); setTimeout(function(){ try{o.stop();}catch(e){} },2500); SND.amb=null; }
  if (!name) return;
  getBuf(name,'ortam').then(function(b){ if (!b || SND.ambName!==name) return; var g=SND.ctx.createGain(); g.gain.value=0; g.connect(SND.musicGain); g.gain.setTargetAtTime(0.8,SND.ctx.currentTime,1); var s=SND.ctx.createBufferSource(); s.buffer=b; s.loop=true; s.connect(g); s.start(); SND.amb=s; SND.ambNode=g; });
}
function musicDirector(){
  if (!G || UI.paused || audioHidden()) return;
  var night=isNight(), se=G.season, battle = G.t - (teamOf(ME).alert?teamOf(ME).alert.t:-99) < 8;
  var m = night ? 'm_gece_baskini' : se===3 ? 'm_kar_cephesi' : se===1 ? 'm_col_firtinasi' : se===2 ? 'm_volkan_ates' : 'm_ova_marsi';
  playMusic(m);
  var rain = (se===2 || (se===0 && Math.sin(G.t/80)>0.4));
  playAmbience(battle ? 'o_savas' : rain ? 'o_yagmur' : se===3 ? 'o_ruzgar' : night ? 'o_gece' : null);
}
var SFX_MAP = { mg:['a_makineli','a_tufek'], cannon:['a_tank_atis'], rocket:['a_roket'], boom:['a_patlama1','a_patlama2'], bigboom:['a_patlama3'], die:['a_tik'], ready:['a_onay'], unit:['a_uretim'], build:['a_metal'], alarm:['a_uyari'], capture:['a_onay'], click:['a_tik'], win:['a_zafer'], lose:['a_yenilgi'], laser:[], claw:[], chop:['a_tik'], pick:['a_metal'] };
function sfx(kind, x, y){
  if (!SND.ctx || SND.vol<=0 || audioHidden()) return;
  var now=SND.ctx.currentTime; if (SND.last[kind] && now-SND.last[kind] < (kind==='mg'?0.07:0.05)) return; SND.last[kind]=now;
  var vol=1, pan=0;
  if (x!=null && typeof CAM!=='undefined'){ var cx=CAM.x+VIEW.w/CAM.z/2, cy=CAM.y+VIEW.h/CAM.z/2, d=dist(x,y,cx,cy); vol = clamp(1 - d/(VIEW.w/CAM.z*0.9), 0, 1); if (vol<=0.02) return; pan=clamp((x-cx)/(VIEW.w/CAM.z/2),-1,1)*0.7; }
  var names=SFX_MAP[kind]||[], name=names[(Math.random()*names.length)|0], b=name&&SND.buf[name];
  var g=SND.ctx.createGain(); g.gain.value=vol*(kind==='mg'?0.35:kind==='die'?0.25:0.7);
  var p = SND.ctx.createStereoPanner ? SND.ctx.createStereoPanner() : null; if (p){ p.pan.value=pan; g.connect(p); p.connect(SND.master); } else g.connect(SND.master);
  if (b){ var s=SND.ctx.createBufferSource(); s.buffer=b; s.playbackRate.value=0.9+Math.random()*0.2; s.connect(g); s.start(); return; }
  // sentez yedek
  var o=SND.ctx.createOscillator(), e=SND.ctx.createGain(); o.connect(e); e.connect(g);
  if (kind==='laser'){ o.type='sawtooth'; o.frequency.setValueAtTime(1400,now); o.frequency.exponentialRampToValueAtTime(200,now+0.15); e.gain.setValueAtTime(0.15,now); e.gain.exponentialRampToValueAtTime(0.001,now+0.18); o.start(now); o.stop(now+0.2); }
  else if (kind==='claw'){ o.type='square'; o.frequency.setValueAtTime(90,now); e.gain.setValueAtTime(0.12,now); e.gain.exponentialRampToValueAtTime(0.001,now+0.12); o.start(now); o.stop(now+0.13); }
  else { o.type='triangle'; o.frequency.setValueAtTime(kind==='ready'?880:220,now); e.gain.setValueAtTime(0.1,now); e.gain.exponentialRampToValueAtTime(0.001,now+0.2); o.start(now); o.stop(now+0.22); }
}
function setVolumes(v,m){ SND.vol=v; SND.mvol=m; if (audioHidden()) return; if (SND.master) SND.master.gain.value=v; if (SND.musicGain) SND.musicGain.gain.value=m; }
