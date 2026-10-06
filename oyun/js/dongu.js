/* ORDU SAVAŞI: KOMUTA — dünya döngüsü: gün/gece, mevsim, sürüler, meteorlar, toplum, görüş */
function step(dt){
  if (G.over && !G.endless) return;
  G.f=(G.f||0)+1; G.t+=dt;
  buildGrid();
  var ents=G.ents.slice();
  for (var i=0;i<ents.length;i++){ var e=ents[i]; if(e.dead||e.hp<=0) continue; if (e.k==='u') updateUnit(e,dt); else updateBuilding(e,dt); }
  separate(dt);
  updateProj(dt);
  updateStrikes(dt);
  updateQueues(0,dt); updateQueues(1,dt);
  if (G.f%8===0) { updateVision(); updateStealth(); }
  if (G.f%30===0) secondTick();
  if (G.f%15===0) for (var at in G.ai) if (G.ai[at]) aiTick(+at, 0.5);
}
/* kütle ağırlıklı itişme (çarpışma) */
function separate(dt){
  var cell=64, grid={}, i, e;
  for (i=0;i<G.ents.length;i++){ e=G.ents[i]; if(e.k!=='u')continue; var key=((e.x/cell)|0)+','+((e.y/cell)|0)+(e.z>10?'a':''); (grid[key]||(grid[key]=[])).push(e); }
  for (i=0;i<G.ents.length;i++){ e=G.ents[i]; if(e.k!=='u')continue; var de=UNT[e.type], cx=(e.x/cell)|0, cy=(e.y/cell)|0, air=e.z>10?'a':'';
    for (var oy=-1;oy<=1;oy++) for (var ox=-1;ox<=1;ox++){ var c=grid[(cx+ox)+','+(cy+oy)+air]; if(!c)continue;
      for (var j=0;j<c.length;j++){ var o=c[j]; if(o.id<=e.id)continue; var dO=UNT[o.type], rr=(de.r+dO.r)*0.8, dx=o.x-e.x, dy=o.y-e.y, d2=dx*dx+dy*dy;
        if (d2>=rr*rr || d2<0.01) { if(d2<0.01){ o.x+=Math.random()-0.5; } continue; }
        var d=Math.sqrt(d2), ov=(rr-d)*0.5, nx=dx/d, ny=dy/d, mt=de.mass+dO.mass, fe=dO.mass/mt, fo=de.mass/mt;
        // hareketsiz olan daha kolay itilir
        if (!e.ord && o.ord) { fe=Math.max(fe,0.7); fo=1-fe; } else if (e.ord && !o.ord) { fo=Math.max(fo,0.7); fe=1-fo; }
        pushTo(e, -nx*ov*fe*2, -ny*ov*fe*2); pushTo(o, nx*ov*fo*2, ny*ov*fo*2);
      } }
  }
}
function pushTo(u, dx, dy){ if (UNT[u.type].air){ u.x+=dx; u.y+=dy; return; } PF_FOOT=UNT[u.type].armor==='pi'; var nx=u.x+dx, ny=u.y+dy; if(!blockedTile(Math.floor(nx/T),Math.floor(u.y/T))) u.x=nx; if(!blockedTile(Math.floor(u.x/T),Math.floor(ny/T))) u.y=ny; PF_FOOT=false; }

var VIS_CIRCLES={};
function updateVision(){
  var vis=G.vis; vis.fill(0);
  var nl=nightLevel();
  G.ents.forEach(function(e){ if(e.team!==ME)return; var d=defOf(e); var s=(d.sight|| (e.k==='b'?Math.max(d.w,d.h)+3:6));
    if (e.k==='u') s*= SEASONS[G.season].sight * (1-0.25*nl);
    s=Math.round(s); stamp(e.x/T|0, e.y/T|0, s); });
  G.ents.forEach(function(e){ if(e.k==='b'&&BLD[e.type].light&&e.team===ME) stamp(e.x/T|0,e.y/T|0,BLD[e.type].light+3); });
  for (var i=0;i<vis.length;i++) if (vis[i]) G.explored[i]=1;
  function stamp(cx,cy,r){ var c=VIS_CIRCLES[r]; if(!c){ c=[]; for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++) if(x*x+y*y<=r*r) c.push(x,y); VIS_CIRCLES[r]=c; }
    for (var j=0;j<c.length;j+=2){ var x=cx+c[j], y=cy+c[j+1]; if(x>=0&&y>=0&&x<N&&y<N) vis[y*N+x]=1; } }
}
function tileVisible(tx,ty){ return inMap(tx,ty) && G.vis[idx(tx,ty)]; }
function entVisible(e){ if (e.team===ME) return true; if (hiddenFrom(e,ME)) return false; var tx=e.x/T|0, ty=e.y/T|0; return tileVisible(tx,ty) || (e.k==='b' && G.explored[idx(tx,ty)] && e.team===2); }

function secondTick(){
  recalcTeam(0); recalcTeam(1);
  // gün sayacı, mevsim
  var day=Math.floor(G.t/DAY_LEN)+1;
  if (day!==G.day){ G.day=day; var se=Math.floor((day-1)/SEASON_DAYS)%4; G.year=Math.floor((day-1)/(SEASON_DAYS*4))+1;
    HOOK.msg('☀ '+G.day+'. gün başladı'+(G.day%BLOOD_MOON===0?' — BU GECE KIZIL AY! Hazırlan!':''), G.day%BLOOD_MOON===0?'bad':'');
    if (se!==G.season){ G.season=se; HOOK.msg(SEASONS[se].ikon+' Mevsim değişti: '+SEASONS[se].ad + (se===3?' — Nehirler dondu, askerler buzda yürüyebilir. Araçlar yavaş.':se===2?' — Çamur: araçlar arazide yavaş.':se===0?' — Kristaller hızlı büyür.':' — Görüş açık.')); HOOK.season && HOOK.season(se); }
    G.horde.spawned=false;
  }
  // gece sürüsü
  if (isNight() && !G.horde.spawned && (G.t%DAY_LEN)/DAY_LEN > SEASONS[G.season].night){ G.horde.spawned=true; spawnHorde(G.day%BLOOD_MOON===0); }
  // gün ışığında mutantlar yanar
  if (!isNight()) G.ents.forEach(function(e){ if(e.k==='u'&&e.team===3&&!UNT[e.type].alien){ e.hp-=e.mhp*0.03; if(Math.random()<0.2) FX.parts.push({x:e.x,y:e.y,vx:0,vy:-20,l:1,m:1,s:3,c:'smoke',g:0}); if(e.hp<=0) kill(e,null,null); } });
  // kristal yeniden büyüme / ağaç büyüme
  var rg=SEASONS[G.season].regrow;
  if (rg>0) for (var n=0;n<Math.floor(N*N/400)*rg;n++){ var k=(Math.random()*N*N)|0; if (MAP.cry[k]>0 && MAP.cry[k]<250 && (MAP.ore[k]===0||MAP.ore[k]===4)) MAP.cry[k]+= MAP.ore[k]===4?1:3; }
  if (G.season===0 && G.decoCut && Math.random()<0.3){ var ks=Object.keys(G.decoCut); if (ks.length){ var kk=ks[(Math.random()*ks.length)|0]; if (G.t-G.decoCut[kk]>DAY_LEN && !G.occ[kk] && !MAP.cry[kk]){ MAP.deco[kk]=DECO.cam; delete G.decoCut[kk]; HOOK.chunkDirty(kk%N,(kk/N)|0); } } }
  // meteor
  if (G.t>G.nextMeteor){ G.nextMeteor = G.t + DAY_LEN*(1.2+Math.random()*1.6); launchMeteor(); }
  G.meteors.forEach(function(m){ m.t+=1; if (m.alien>0 && Math.random()<0.04 && isNight()){ m.alien--; var a=spawnUnit('alien',3,m.x+(Math.random()-0.5)*60,m.y+(Math.random()-0.5)*60); a.sick=0; } });
  // toplum
  for (var t=0;t<2;t++) societyTick(t);
  // kasabalar
  G.towns.forEach(function(tw){ for (var t2=0;t2<2;t2++){ if (tw.loy[t2]>60){ var tm=teamOf(t2); if (tm.cr<tm.cap) tm.cr += 1.5*(tw.loy[t2]-60)/40*(tw.pop/1500); } } });
  // sürekli savaş: Sonsuz modda düşman yeniden doğar
  var ai=G.ai[1]; if (G.endless && ai && ai.respawnAt && G.t>ai.respawnAt){ ai.respawnAt=0; respawnEnemy(); }
  checkOver();
}
function societyTick(t){
  var tm=teamOf(t), s=tm.soc, L=s.laws;
  var target = 60 + LAWS.vergi.secenek[L.vergi].moral*15 + LAWS.askerlik.secenek[L.askerlik].moral*15 + LAWS.gece.secenek[L.gece].moral*15 + LAWS.saglik.secenek[L.saglik].moral*15;
  if (lowPower(t)) target-=15;
  var avgL = s.clans.reduce(function(a,c){return a+c.sadakat;},0)/s.clans.length; target += (avgL-60)*0.3;
  if (isNight() && G.day%BLOOD_MOON===0) target-=10;
  s.moral += (clamp(target,0,100)-s.moral)*0.01;
  s.clans.forEach(function(c){ c.sadakat += ((s.moral)-c.sadakat)*0.003; });
  if (L.saglik===1){ if (tm.cr>3) { tm.cr-=LAWS.saglik.secenek[1].maliyet; G.ents.forEach(function(e){ if(e.team===t&&e.k==='u'&&UNT[e.type].armor==='pi'&&e.hp<e.mhp&&nearestOwnDist(e,'barracks')<10*T){ e.hp=Math.min(e.mhp,e.hp+5); if(e.sick&&Math.random()<0.1) e.sick=0; } }); } }
  // çok düşük moral: firar
  if (s.moral<20 && Math.random()<0.02){ var inf=G.ents.filter(function(e){return e.team===t&&e.k==='u'&&e.p;}); if (inf.length){ var dz=inf[(Math.random()*inf.length)|0]; if(t===ME) HOOK.msg(personTitle(dz.p)+' moral bozukluğundan firar etti!','bad'); removeEnt(dz); } }
}
function nearestOwnDist(u,type){ var b=nearestOwn(u,type); return b?dist(u.x,u.y,b.x,b.y):1e9; }
function townCredit(team, x, y){ G.towns.forEach(function(tw){ if (dist(x/T,y/T,tw.x,tw.y)<tw.r+4){ tw.loy[team]=Math.min(100,tw.loy[team]+2); var o=1-team; tw.loy[o]=Math.max(0,tw.loy[o]-0.5); if (team===ME && tw.loy[team]>=60 && !tw.joined){ tw.joined=true; HOOK.msg(tw.ad+' halkı seni destekliyor! Vergi gelmeye başladı.','good'); } } }); }

function spawnHorde(blood){
  var n = Math.round((6 + G.day*1.6) * (blood?2.5:1) * [0.6,1,1.4][G.diff] * Math.pow(N/160,1.2));
  n=Math.min(n, 140);
  HOOK.msg(blood?'🩸 KIZIL AY! Dev mutant sürüsü geliyor!':'🌙 Gece çöktü. Mutant sürüsü yaklaşıyor…','bad'); HOOK.sound('alarm');
  var spots=[];
  G.towns.forEach(function(tw){ spots.push({x:tw.x,y:tw.y}); });
  for (var e=0;e<4;e++) spots.push({x:[2,N-3,N/2,N/2][e], y:[N/2,N/2,2,N-3][e]});
  for (var i=0;i<n;i++){
    var s=spots[(Math.random()*spots.length)|0], tx=Math.floor(s.x+(Math.random()-0.5)*10), ty=Math.floor(s.y+(Math.random()-0.5)*10);
    var p=PF.nearestFree(clamp(tx,1,N-2),clamp(ty,1,N-2)); if (blockedTile(p[0],p[1])) continue;
    var r=Math.random(), type = r < (blood?0.12:0.05)+G.day*0.004 ? 'brute' : r<0.4 ? 'runner' : 'mutant';
    var u=spawnUnit(type,3,(p[0]+0.5)*T,(p[1]+0.5)*T); u.mhp*=1+G.day*0.03; u.hp=u.mhp;
  }
}
function launchMeteor(){
  var x=(10+Math.random()*(N-20))*T, y=(10+Math.random()*(N-20))*T;
  G.falls.push({x:x,y:y,t:0,T:4});
  HOOK.msg('☄ Gökyüzünde parlak bir cisim! Meteor düşüyor…','');
}
function updateStrikes(dt){
  for (var i=G.falls.length-1;i>=0;i--){ var f=G.falls[i]; f.t+=dt; if (f.t>=f.T){ G.falls.splice(i,1); meteorImpact(f.x,f.y); } }
  for (var j=G.strikes.length-1;j>=0;j--){ var s=G.strikes[j]; s.t-=dt; if (Math.random()<0.6) FX.parts.push({x:s.x+(Math.random()-0.5)*80,y:s.y+(Math.random()-0.5)*80,vx:0,vy:-60,l:0.6,m:0.6,s:3,c:'cyan',g:0});
    if (s.t<=0){ G.strikes.splice(j,1); FX.beams.push({x1:s.x,y1:s.y-2000,x2:s.x,y2:s.y,c:'rgba(150,230,255,',w:40,l:1.2,m:1.2,glow:true});
      for (var k=0;k<14;k++) fxExplosion(s.x+(Math.random()-0.5)*160, s.y+(Math.random()-0.5)*160, 1.6, Math.random()*0.6);
      fxRing(s.x,s.y,'#bff',5*T); FX.shake=20; HOOK.sound('bigboom',s.x,s.y); splash(s.x,s.y,5*T,3200,'iyon',s.team,null,true); FX.decals.push({x:s.x,y:s.y,r:90,k:'scorch',a:0}); } }
}
function meteorImpact(x,y){
  fxExplosion(x,y,3); for (var k=0;k<10;k++) fxExplosion(x+(Math.random()-0.5)*120,y+(Math.random()-0.5)*120,1.2,Math.random()*0.5);
  fxRing(x,y,'#ffb070',4*T); FX.shake=16; HOOK.sound('bigboom',x,y);
  splash(x,y,3.5*T,900,'iyon',null,null,true);
  FX.decals.push({x:x,y:y,r:70,k:'crater',a:Math.random()*6});
  // yeni element: Zenit yatağı
  var cx=x/T|0, cy=y/T|0;
  for (var oy=-3;oy<=3;oy++) for (var ox=-3;ox<=3;ox++){ var tx=cx+ox, ty=cy+oy; if(!inMap(tx,ty))continue; var k2=idx(tx,ty); if (terrBlocked(MAP.terr[k2])||G.occ[k2]||MAP.terr[k2]===TER.BRIDGE) continue; var dd=Math.sqrt(ox*ox+oy*oy); if (dd>3.2) continue; if (MAP.deco[k2]) { MAP.deco[k2]=0; } MAP.cry[k2]=Math.floor(200*(1-dd/4)+40); MAP.ore[k2]=5; MAP.terr[k2]=TER.DIRT; HOOK.chunkDirty(tx,ty); }
  var virus=Math.random()<0.6, aliens=Math.random()<0.7 ? 2+Math.floor(Math.random()*4) : 0;
  G.meteors.push({id:G.nid++, x:x, y:y, t:0, sample:120, virus:virus, alien:aliens});
  if (G.meteors.length>8) G.meteors.shift();
  revealAround(cx,cy,4);
  HOOK.msg('☄ Meteor düştü! Yeni element (Zenit) bulundu. Bilim insanı gönder, incelesin.'+(virus?' Dikkat: virüs belirtisi var!':''),'');
  if (aliens) for (var a=0;a<Math.ceil(aliens/2);a++) spawnUnit('alien',3,x+(Math.random()-0.5)*60,y+(Math.random()-0.5)*60);
  if (virus) G.ents.forEach(function(e){ if(e.k==='u'&&UNT[e.type].armor==='pi'&&!UNT[e.type].horde&&dist(e.x,e.y,x,y)<6*T&&!(e.team<2&&teamOf(e.team).disc.asi)) e.sick=0.01; });
}
function respawnEnemy(){
  // Sonsuz mod: Kızıl Cephe yeni bir köşede toplanır, güçlenerek
  var spots=[{x:N-26,y:26},{x:N-26,y:N-26},{x:26,y:26}], best=null, bd=-1;
  spots.forEach(function(s){ var md=1e9; G.ents.forEach(function(e){ if(e.team===ME&&e.k==='b') md=Math.min(md,dist(s.x,s.y,e.x/T,e.y/T)); }); if (md>bd){bd=md;best=s;} });
  for (var y=best.y-6;y<=best.y+6;y++) for (var x=best.x-6;x<=best.x+6;x++){ if(!inMap(x,y))continue; var k=idx(x,y); if(!G.occ[k]&&terrBlocked(MAP.terr[k])) MAP.terr[k]=TER.DIRT; MAP.deco[k]=0; MAP.cry[k]=0; HOOK.chunkDirty(x,y); }
  placeBuilding('yard',1,best.x-2,best.y-2,true);
  var tm=teamOf(1); tm.cr += 6000 + G.day*400;
  for (var i=0;i<6+G.day/2;i++) spawnUnit(['tank','rocket','rifle','aa'][i%4],1,(best.x+4)*T+(i%4)*20,(best.y+4)*T+(i>>2)*20);
  G.ai[1].base={x:best.x,y:best.y}; G.ai[1].wave=0;
  HOOK.msg('Kızıl Cephe yeni bir üs kurdu! Savaş sürüyor…','bad');
}
