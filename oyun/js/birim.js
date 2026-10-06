/* ORDU SAVAŞI: KOMUTA — birim davranışı: fizik tabanlı hareket, emirler, savaş, toplama */
function isNight(){ var f=(G.t%DAY_LEN)/DAY_LEN; return f>SEASONS[G.season].night || f<0.04; }
function nightLevel(){ var f=(G.t%DAY_LEN)/DAY_LEN, n=SEASONS[G.season].night; if (f<0.04) return 1-f/0.04; if (f<n-0.06) return 0; if (f<n) return (f-(n-0.06))/0.06; if (f>0.97) return 1; return 1; }

/* ---------- emirler ---------- */
function orderMove(units, x, y, attackMove){
  var n=units.length; if(!n) return;
  // diziliş: halkalar
  var sorted=units.slice().sort(function(a,b){ return dist(a.x,a.y,x,y)-dist(b.x,b.y,x,y); });
  var ring=0, slot=0, perRing=1;
  sorted.forEach(function(u,i){
    var ox=0, oy=0;
    if (i>0){ slot++; if (slot>=perRing){ ring++; slot=0; perRing=ring*6; } var a=slot/perRing*Math.PI*2 + ring; ox=Math.cos(a)*ring*26; oy=Math.sin(a)*ring*26; }
    u.ord={k: attackMove?'amove':'move', x:x+ox, y:y+oy}; u.tgt=0; u.path=null; u.hs=null; u.cv=null; u.chan=0;
  });
}
function orderAttack(units, target){
  units.forEach(function(u){ var d=UNT[u.type];
    if (d.capture && target.team!==u.team) { u.ord={k:'capture', id:target.id}; u.path=null; return; }
    if (!d.wpn) { u.ord={k:'move', x:target.x, y:target.y}; u.path=null; return; }
    if (!canHit(u, target)) { u.ord={k:'move', x:target.x, y:target.y}; u.path=null; return; }
    u.ord={k:'attack', id:target.id}; u.tgt=target.id; u.path=null; });
}
function orderCapture(units, target){ units.forEach(function(u){ if(UNT[u.type].capture){ u.ord={k:'capture', id:target.id, mission:true}; u.path=null; } }); }
function orderHarvest(units, tx, ty){ units.forEach(function(u){ if(UNT[u.type].harvest){ u.ord={k:'harvest'}; u.hs='go'; u.hx=tx; u.hy=ty; u.path=null; } }); }
function orderGather(units, tx, ty){ units.forEach(function(u){ if(UNT[u.type].gather){ u.ord={k:'gather', tx:tx, ty:ty}; u.path=null; u.hs='go'; } }); }
function orderLoot(units, li){ units.forEach(function(u){ if(UNT[u.type].armor==='pi'){ u.ord={k:'loot', i:li}; u.path=null; } }); }
function orderStudy(units, m){ units.forEach(function(u){ if(UNT[u.type].science){ u.ord={k:'study', id:m.id}; u.path=null; } }); }
function orderStop(units){ units.forEach(function(u){ u.ord=null; u.path=null; u.tgt=0; u.cv=null; }); }

/* ---------- görünürlük / hedef ---------- */
function canHit(u, t){
  var w = (u.k==='u'?UNT[u.type]:BLD[u.type]).wpn; if(!w) return false;
  var air = t.k==='u' && UNT[t.type].air;
  if (air ? !w.air : !w.ground) return false;
  var armor = t.k==='b'?'bina':UNT[t.type].armor;
  return (DMG[w.type][armor]||0) > 0;
}
function hiddenFrom(e, team){ // gizli ajan
  if (e.k!=='u' || !UNT[e.type].stealth) return false;
  if (e.team===team) return false;
  return !e.seen;
}
function updateStealth(){
  for (var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.k!=='u'||!UNT[a.type].stealth) continue;
    var seen=false, gizli=a.team<2 && teamOf(a.team).up.gizli;
    for (var j=0;j<G.ents.length && !seen;j++){ var e=G.ents[j]; if(!isEnemy(e.team,a.team)) continue;
      var d=dist(a.x,a.y,e.x,e.y);
      if (e.k==='b'){ var det=BLD[e.type].detect; if (det && d<det*T) seen=true; }
      else if (!gizli && d<2.6*T && !UNT[e.type].air) seen=true; }
    if (a.cdFire && G.t-a.cdFire<2) seen=true;
    a.seen=seen;
  }
}
function acquire(u, rangeTiles){
  var best=null, bs=-1, R2=rangeTiles*T, w=(u.k==='u'?UNT[u.type]:BLD[u.type]).wpn;
  var near=gridQuery(u.x,u.y,R2+64);
  for (var i=0;i<near.length;i++){ var e=near[i]; if(!isEnemy(u.team,e.team)||e.hp<=0) continue;
    var d=edgeDist(u,e); if (d>R2) continue;
    if (hiddenFrom(e,u.team)) continue;
    if (!canHit(u,e)) continue;
    if (w.minr && d<w.minr*T) continue;
    var armor=e.k==='b'?'bina':UNT[e.type].armor;
    var s = DMG[w.type][armor] * 300/(d+60);
    if (e.k==='b' && !BLD[e.type].wpn) s*=0.4; // önce tehdit
    if (e.k==='b' && BLD[e.type].wall) s*=0.15;
    if (e.k==='u' && UNT[e.type].wpn) s*=1.3;
    if (s>bs){ bs=s; best=e; }
  }
  return best;
}

/* ---------- fizik tabanlı hareket ---------- */
function steer(u, dt, tx, ty, arriveR){
  var d=UNT[u.type], dx=tx-u.x, dy=ty-u.y, L=Math.sqrt(dx*dx+dy*dy);
  var ttx=Math.floor(u.x/T), tty=Math.floor(u.y/T);
  var maxS = d.spd * (d.air?1:speedMul(ttx,tty,d.armor)) * (u.cargo>0&&d.harvest?0.85:1);
  if (u.sick) maxS*=0.8;
  if (d.horde && isNight()) maxS*=1.35;
  var want = L < (arriveR||6) ? 0 : maxS;
  // varışta yavaşla: v^2 = 2 a d
  want = Math.min(want, Math.sqrt(2*d.acc*Math.max(0,L-2)) + 4);
  var ta=Math.atan2(dy,dx), da=angDiff(u.ang, ta);
  if (d.armor==='pi'||d.horde) { u.ang=ta; }
  else { var tr=d.turn*dt; u.ang += clamp(da,-tr,tr); if (Math.abs(da)>1.0 && !d.air) want=Math.min(want, maxS*0.15); }
  // ivme sınırı (kütle -> düşük ivme)
  var dv=want-u.s; u.s += clamp(dv, -d.acc*2.2*dt, d.acc*dt);
  var mvx=Math.cos(u.ang)*u.s, mvy=Math.sin(u.ang)*u.s;
  if (d.air) { u.vx+= (mvx-u.vx)*Math.min(1,dt*3); u.vy+=(mvy-u.vy)*Math.min(1,dt*3); }
  else { u.vx=mvx; u.vy=mvy; }
  return L;
}
function integrate(u, dt){
  var d=UNT[u.type];
  var nx=u.x+u.vx*dt, ny=u.y+u.vy*dt;
  if (d.air){ u.x=clamp(nx,4,N*T-4); u.y=clamp(ny,4,N*T-4); return; }
  PF_FOOT = d.armor==='pi';
  var r=Math.min(d.r*0.6,10);
  if (!blockedTile(Math.floor((nx+Math.sign(u.vx)*r)/T), Math.floor(u.y/T))) u.x=nx; else { u.s*=0.5; }
  if (!blockedTile(Math.floor(u.x/T), Math.floor((ny+Math.sign(u.vy)*r)/T))) u.y=ny; else { u.s*=0.5; }
  // sıkışma: bloklu karoda kaldıysa dışarı it
  if (blockedTile(Math.floor(u.x/T), Math.floor(u.y/T))){ var p=PF.nearestFree(Math.floor(u.x/T), Math.floor(u.y/T)); u.x+=((p[0]+0.5)*T-u.x)*0.2; u.y+=((p[1]+0.5)*T-u.y)*0.2; }
  PF_FOOT=false;
  // mayın
  if (G.mines.length){ for (var i=G.mines.length-1;i>=0;i--){ var m=G.mines[i]; if (isEnemy(m.team,u.team) && dist(m.x,m.y,u.x,u.y)<14){ G.mines.splice(i,1); fxExplosion(m.x,m.y,1.1); HOOK.sound('boom',m.x,m.y); splash(m.x,m.y,40,420,'top',m.team,null,false); } } }
}
function followPath(u, dt, gx, gy, arriveR){
  var d=UNT[u.type];
  if (d.air){ return steer(u, dt, gx, gy, arriveR||10); }
  if (!u.path || Math.abs(u.pgx-gx)+Math.abs(u.pgy-gy) > (u.path.length? Math.max(48, dist(u.x,u.y,gx,gy)*0.25):4)){
    u.path = PF.find(Math.floor(u.x/T), Math.floor(u.y/T), Math.floor(gx/T), Math.floor(gy/T), 9000, d.armor==='pi');
    u.pi=0; u.pgx=gx; u.pgy=gy; u.stk=0; u.lx=u.x; u.ly=u.y;
    if (u.path.length && !blockedTile(Math.floor(gx/T),Math.floor(gy/T))) u.path[u.path.length-1]=[gx,gy];
  }
  // takılma algılama
  u.stk += dt; if (u.stk>2){ if (dist(u.x,u.y,u.lx,u.ly)<10 && u.path.length){ u.path=null; u.rt=(u.rt||0)+1; if (u.rt>3){ u.rt=0; return 0; } return 999; } u.stk=0; u.lx=u.x; u.ly=u.y; }
  if (!u.path.length) { var dg=dist(u.x,u.y,gx,gy); if (dg<56 && dg>(arriveR||6)) { steer(u,dt,gx,gy,arriveR||6); return dg; } u.vx=u.vy=0; u.s=0; return 0; }
  var wp=u.path[u.pi], last=u.pi===u.path.length-1;
  var L=steer(u, dt, wp[0], wp[1], last?(arriveR||6):2);
  if (!last && L<Math.max(14,d.r)) u.pi++;
  return last ? L : 999;
}
function halt(u){ u.vx=0; u.vy=0; u.s=Math.max(0,u.s-UNT[u.type].acc*0.1); }

/* ---------- ateş ---------- */
function fire(src, t, w, team){
  var sx=src.x, sy=src.y-(src.z||0), tx=t.x, ty=t.y-(t.z||0), d=dist(sx,sy,tx,ty);
  src.cdFire=G.t;
  var ang=Math.atan2(ty-sy,tx-sx), mx=sx+Math.cos(ang)*(src.k==='b'?14:(UNT[src.type].r+4)), my=sy+Math.sin(ang)*(src.k==='b'?14:UNT[src.type].r+4);
  if (src.k==='b') { mx=sx+Math.cos(ang)*14; my=sy-BLD[src.type].H*0.6+Math.sin(ang)*14; }
  var dmg=w.dmg;
  switch (w.fx){
    case 'tracer': { // anlık mermi: isabet olasılığı mesafe, hedef hızı ve boyutuna bağlı
      var tsp = t.k==='u' ? Math.sqrt(t.vx*t.vx+t.vy*t.vy) : 0, size = t.k==='b'?40:UNT[t.type].r;
      var p = clamp(0.98 - d/(w.range*T)*0.3 - tsp/400 + size/80, 0.3, 0.98);
      var fall = d > 0.6*w.range*T ? 1-0.35*(d/(w.range*T)-0.6)/0.4 : 1;
      var hit = Math.random()<p;
      var ex=tx+(hit?0:(Math.random()-0.5)*30), ey=ty+(hit?0:(Math.random()-0.5)*30);
      FX.beams.push({x1:mx,y1:my,x2:ex,y2:ey,c:'rgba(255,230,140,',w:1.4,l:0.08,m:0.08});
      fxFlash(mx,my,5,'#ffe9a0');
      if (hit) { applyDmg(t, dmg*fall, w.type, team, src); if (Math.random()<0.3) fxSpark(ex,ey); }
      HOOK.sound('mg', sx, sy); break; }
    case 'laser': {
      FX.beams.push({x1:mx,y1:my,x2:tx,y2:ty,c: team===ME?'rgba(120,220,255,':'rgba(255,90,90,',w:src.type==='yz'?4:2,l:0.18,m:0.18, glow:true});
      fxSpark(tx,ty,'#bff'); applyDmg(t, dmg, w.type, team, src); HOOK.sound('laser',sx,sy); break; }
    case 'flak': {
      for (var i=0;i<3;i++) fxPuff(tx+(Math.random()-0.5)*26, ty+(Math.random()-0.5)*26);
      FX.beams.push({x1:mx,y1:my,x2:tx,y2:ty,c:'rgba(255,200,120,',w:1,l:0.06,m:0.06});
      if (Math.random()<0.85) applyDmg(t, dmg, w.type, team, src); HOOK.sound('mg',sx,sy); break; }
    case 'claw': { applyDmg(t, dmg, w.type, team, src); fxBlood(tx,ty,false,2);
      if (UNT[src.type] && UNT[src.type].alien && t.k==='u' && UNT[t.type].armor==='pi' && !(t.team<2&&teamOf(t.team).disc.asi)) t.sick=Math.max(t.sick,1);
      HOOK.sound('claw',sx,sy); break; }
    case 'shell': {
      // düz atış mermisi: hedefin gelecekteki konumuna nişan (öngörü), 650 px/sn
      var v=650, tof=d/v, lx=tx+(t.vx||0)*tof, ly=ty+(t.vy||0)*tof;
      var sp=0.02*d; lx+=(Math.random()-0.5)*sp; ly+=(Math.random()-0.5)*sp;
      G.proj.push({k:'shell', x:mx,y:my, sx:mx,sy:my, tx:lx, ty:ly, v:v, dmg:dmg, type:w.type, team:team, src:src.id, t:0, T:dist(mx,my,lx,ly)/v, sp:w.splash||0.6});
      fxFlash(mx,my,10,'#ffd27a'); fxSmoke(mx,my,2); HOOK.sound('cannon',sx,sy); break; }
    case 'arty': {
      // balistik atış: yerçekimi ile parabol, uçuş süresi mesafeye bağlı
      var tof2=1.1+d/450, lx2=tx+(t.vx||0)*tof2, ly2=ty+(t.vy||0)*tof2, sp2=0.045*d;
      lx2+=(Math.random()-0.5)*sp2; ly2+=(Math.random()-0.5)*sp2;
      G.proj.push({k:'arty', x:mx,y:my, sx:mx,sy:my, tx:lx2, ty:ly2, dmg:dmg, type:w.type, team:team, src:src.id, t:0, T:tof2, vz:400*tof2/2, z:0, sp:w.splash||1.5});
      fxFlash(mx,my,14,'#ffcf6a'); fxSmoke(mx,my,4); HOOK.sound('cannon',sx,sy); break; }
    case 'rocket': {
      G.proj.push({k:'rocket', x:mx,y:my, vx:Math.cos(ang)*120, vy:Math.sin(ang)*120, a:ang, tid:t.id, tx:tx, ty:ty, dmg:dmg, type:w.type, team:team, src:src.id, t:0, fuel:3.2});
      fxFlash(mx,my,7,'#ffb060'); HOOK.sound('rocket',sx,sy); break; }
    case 'emp': {
      G.proj.push({k:'emp', x:mx,y:my, sx:mx, sy:my, tx:tx, ty:ty, v:340, dmg:dmg, type:'emp', team:team, src:src.id, t:0, T:d/340, sp:w.splash||1.8});
      HOOK.sound('laser',sx,sy); break; }
  }
}
function updateProj(dt){
  for (var i=G.proj.length-1;i>=0;i--){ var p=G.proj[i]; p.t+=dt; var done=false;
    var src=byId(p.src);
    if (p.k==='shell' || p.k==='emp'){
      var f=Math.min(1,p.t/p.T); p.x=p.sx+(p.tx-p.sx)*f; p.y=p.sy+(p.ty-p.sy)*f;
      if (p.k==='shell'){ // yoldaki ilk düşmana çarpar
        for (var j=0;j<G.ents.length;j++){ var e=G.ents[j]; if(!isEnemy(p.team,e.team)||(e.k==='u'&&e.z>10))continue; var hd = e.k==='b'? rectDist(e,p.x,p.y) : dist(e.x,e.y,p.x,p.y)-UNT[e.type].r; if (hd<2){ done=true; break; } } }
      if (f>=1) done=true;
      if (done){ if (p.k==='emp'){ fxRing(p.x,p.y,'#6fd0ff',p.sp*T); splash(p.x,p.y,p.sp*T,p.dmg,'emp',p.team,src,false); }
                 else { fxExplosion(p.x,p.y,0.5); splash(p.x,p.y,p.sp*T,p.dmg,p.type,p.team,src,false); FX.decals.push({x:p.x,y:p.y,r:8,k:'scorch',a:0}); } }
    } else if (p.k==='arty'){
      var f2=Math.min(1,p.t/p.T); p.x=p.sx+(p.tx-p.sx)*f2; p.y=p.sy+(p.ty-p.sy)*f2; p.z=p.vz*p.t - 0.5*400*p.t*p.t;
      if (Math.random()<0.5) FX.parts.push({x:p.x,y:p.y-p.z,vx:0,vy:0,l:0.5,m:0.5,s:2,c:'smoke',g:0});
      if (f2>=1){ done=true; fxExplosion(p.x,p.y,1.0); HOOK.sound('boom',p.x,p.y); splash(p.x,p.y,p.sp*T,p.dmg,p.type,p.team,src,true); FX.decals.push({x:p.x,y:p.y,r:14,k:'scorch',a:0}); FX.shake=Math.min(8,FX.shake+2); }
    } else if (p.k==='rocket'){
      var t=byId(p.tid); if (t){ p.tx=t.x; p.ty=t.y-(t.z||0); }
      var ta=Math.atan2(p.ty-p.y, p.tx-p.x); p.fuel-=dt;
      if (p.fuel>0){ p.a += clamp(angDiff(p.a,ta), -4.5*dt, 4.5*dt); var sp=Math.min(460, Math.sqrt(p.vx*p.vx+p.vy*p.vy)+700*dt); p.vx=Math.cos(p.a)*sp; p.vy=Math.sin(p.a)*sp; }
      else { p.vy+=60*dt; }
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      if (Math.random()<0.8) FX.parts.push({x:p.x,y:p.y,vx:(Math.random()-0.5)*10,vy:(Math.random()-0.5)*10,l:0.7,m:0.7,s:2.5,c:'smoke',g:0});
      if (t && dist(p.x,p.y,p.tx,p.ty) < (t.k==='b'?24:UNT[t.type].r+4)){ done=true; applyDmg(t,p.dmg,p.type,p.team,src); fxExplosion(p.x,p.y,0.45); }
      else if (p.fuel<-1.5 || (!t && dist(p.x,p.y,p.tx,p.ty)<10)){ done=true; fxExplosion(p.x,p.y,0.4); splash(p.x,p.y,20,p.dmg*0.5,p.type,p.team,src,false); }
    }
    if (done) G.proj.splice(i,1);
  }
}

/* ---------- birim güncelleme ---------- */
function updateUnit(u, dt){
  var d=UNT[u.type];
  if (u.cd>0) u.cd-=dt;
  if (u.stun>0){ u.stun-=dt; halt(u); u.cv=null; if(Math.random()<0.3) fxSpark(u.x+(Math.random()-0.5)*d.r*2, u.y+(Math.random()-0.5)*d.r*2,'#8ff'); return; }
  if (u.sick>0){ u.sick+=dt; if (u.hp>5) u.hp-=dt*2.2; if (Math.random()<dt*0.5) spreadVirus(u); if (u.team<2 && teamOf(u.team).disc.asi) u.sick=0; }
  if (u.vet>=3 && u.hp<u.mhp) u.hp=Math.min(u.mhp,u.hp+dt*3);
  if (d.air){ var tz = 40 + Math.sin(G.t*2+u.id)*3; u.z += (tz-u.z)*dt*2; }
  var o=u.ord;
  // otomatik hedef seçimi
  if (d.wpn && (!o || o.k==='amove' || o.k==='guard' || (d.horde))) {
    var cur=byId(u.tgt);
    if (cur && (cur.hp<=0 || !isEnemy(u.team,cur.team) || hiddenFrom(cur,u.team))) { u.tgt=0; cur=null; }
    if ((!cur || ((G.f+u.id)%15===0)) && ((G.f+u.id)%6<1)) { var nt=acquire(u, d.horde ? d.sight : d.sight*SEASONS[G.season].sight*(isNight()&&!d.horde?0.8:1)); if (nt) { u.tgt=nt.id; if(!u.gx && !o){ u.gx=u.x; u.gy=u.y; } } }
  }
  if (d.convert && u.conv) updateConvert(u, dt);
  // emir işleme
  if (o && o.k==='attack'){ var t=byId(o.id); if (!t || t.hp<=0 || !isEnemy(u.team,t.team) || hiddenFrom(t,u.team)){ u.ord=null; } else { engage(u,t,dt,true); return; } }
  if (o && o.k==='capture'){ doCapture(u,o,dt); return; }
  if (o && o.k==='harvest'){ doHarvest(u,dt); return; }
  if (o && o.k==='gather'){ doGather(u,o,dt); return; }
  if (o && o.k==='loot'){ doLoot(u,o,dt); return; }
  if (o && o.k==='study'){ doStudy(u,o,dt); return; }
  var tg=byId(u.tgt);
  if (tg && d.wpn && (!o || o.k==='amove')){
    // kovalama sınırı
    if (!o && u.gx && dist(u.x,u.y,u.gx,u.gy) > 9*T && !d.horde) { u.tgt=0; u.ord={k:'move',x:u.gx,y:u.gy}; u.gx=0; return; }
    engage(u,tg,dt,false); return;
  }
  if (o && (o.k==='move'||o.k==='amove')){
    var L=followPath(u,dt,o.x,o.y,8);
    if (L<10 || L===0){ u.ord=null; u.path=null; halt(u); u.gx=u.x; u.gy=u.y; if (d.harvest) u.ord={k:'harvest'}; }
    integrate(u,dt); return;
  }
  if (d.horde && !o){ hordeThink(u); }
  if (d.harvest && !o){ u.ord={k:'harvest'}; }
  if (d.gather && !o && (G.f+u.id)%90===0 && u.team!==ME) autoGather(u);
  halt(u); integrate(u,dt);
  // turret boşta yavaşça gövdeye döner
  u.tang += angDiff(u.tang, u.ang)*dt*2;
}
function engage(u, t, dt, forced){
  var d=UNT[u.type], w=d.wpn, R=w.range*T, ed=edgeDist(u,t);
  var ta=Math.atan2(t.y-(t.z||0)-u.y+(u.z||0), t.x-u.x);
  if (ed>R || (w.minr && ed<w.minr*T)){
    if (w.minr && ed<w.minr*T){ var away=Math.atan2(u.y-t.y,u.x-t.x); followPath(u,dt,u.x+Math.cos(away)*80,u.y+Math.sin(away)*80,4); }
    else followPath(u, dt, t.x, t.y, Math.max(4, R*0.85));
    integrate(u,dt);
    u.tang += clamp(angDiff(u.tang, ta), -4*dt, 4*dt);
    return;
  }
  u.path=null;
  if (d.air && u.type==='heli'){ steer(u,dt,t.x+Math.cos(G.t+u.id)*R*0.7, t.y+Math.sin(G.t+u.id)*R*0.7, 10); integrate(u,dt); }
  else if (d.air){ steer(u,dt,t.x+Math.cos(G.t*2+u.id)*R*0.6, t.y+Math.sin(G.t*2+u.id)*R*0.6, 4); integrate(u,dt); }
  else { halt(u); if (d.armor==='pi'||d.horde) u.ang=ta; integrate(u,dt); }
  // taret dönüşü (fiziksel dönüş hızı)
  var trate = d.armor==='pi'||d.horde ? 20 : d.mass>30000 ? 1.8 : 4;
  var dd=angDiff(u.tang, ta); u.tang += clamp(dd, -trate*dt, trate*dt);
  if (u.cd<=0 && Math.abs(dd)<0.25){
    var tm=u.team<2?teamOf(u.team):null;
    u.cd = w.rof * (tm&&lowPower(u.team)&&d.convert?1.5:1);
    fire(u, t, w, u.team);
  }
}
/* Ana YZ: menzildeki düşmanı ışınla dönüştürür */
function updateConvert(u, dt){
  var R=8*T;
  var c=u.cv ? byId(u.cv.id) : null;
  if (c && (c.team===u.team || c.hp<=0 || edgeDist(u,c)>R)) { u.cv=null; c=null; }
  if (!c && (G.f+u.id)%10===0){
    var best=null, bd=1e9;
    G.ents.forEach(function(e){ if(e.team===u.team||e.team===3&&false) return; if (e.k==='u'&&UNT[e.type].horde) return; if (hiddenFrom(e,u.team)) return; var dd=edgeDist(u,e); if (dd<R && dd<bd){ bd=dd; best=e; } });
    if (best) u.cv={id:best.id, p:0};
  }
  if (u.cv && (c=byId(u.cv.id))){
    var tt = clamp(c.mhp/450, 1.5, 12) * (lowPower(u.team)?2:1) * (c.type==='yz'?3:1);
    u.cv.p += dt/tt;
    if (Math.random()<0.4) FX.parts.push({x:c.x+(Math.random()-0.5)*20,y:c.y+(Math.random()-0.5)*20,vx:(u.x-c.x)*0.5,vy:(u.y-c.y)*0.5,l:0.6,m:0.6,s:2,c:'cyan',g:0});
    if (u.cv.p>=1){ convertEnt(c, u.team, 'YZ dönüştürdü'); u.cv=null; }
  }
}
function doCapture(u, o, dt){
  var t=byId(o.id);
  if (!t || t.team===u.team || t.hp<=0){ u.ord=null; return; }
  var ed=edgeDist(u,t);
  if (ed>22){ followPath(u,dt,t.x,t.y,4); integrate(u,dt); u.chan=0; return; }
  halt(u);
  if (t.k==='u'){ u.chan+=dt; if (u.chan<1.5) return; }
  var tm=teamOf(u.team);
  if (t.k==='b' && t.type==='refinery' && t.team<2){ var steal=Math.floor(teamOf(t.team).cr*0.5); teamOf(t.team).cr-=steal; tm.cr+=steal; if(u.team===ME) HOOK.msg('Ajan '+steal+' kredi çaldı!','good'); }
  convertEnt(t, u.team, 'Ajan ele geçirdi');
  removeEnt(u);
}
/* ---------- toplayıcı ---------- */
var HCAP=200;
function doHarvest(u, dt){
  var tm=teamOf(u.team), rate=40*(tm.up&&tm.up.hasat?1.35:1);
  if (!u.hs) u.hs = u.cargo>=HCAP ? 'ret' : 'seek';
  if (u.hs==='seek'){
    var p=findOre(u); if(!p){ halt(u); integrate(u,dt); if (u.cargo>0) u.hs='ret'; return; }
    u.hx=p[0]; u.hy=p[1]; u.hs='go'; u.path=null;
  }
  if (u.hs==='go'){
    if (!MAP.cry[idx(u.hx,u.hy)]) { u.hs='seek'; return; }
    var L=followPath(u,dt,(u.hx+0.5)*T,(u.hy+0.5)*T,6); integrate(u,dt);
    if (L<10 || (L===0)) { u.hs='mine'; }
    return;
  }
  if (u.hs==='mine'){
    halt(u); integrate(u,dt);
    var k=idx(u.hx,u.hy);
    if (!MAP.cry[k]) { if (u.cargo>=HCAP*0.9) u.hs='ret'; else { var q=findOre(u,4); if(q){u.hx=q[0];u.hy=q[1];u.hs='go';u.path=null;} else u.hs=u.cargo>0?'ret':'seek'; } return; }
    var take=Math.min(MAP.cry[k], rate*dt, HCAP-u.cargo);
    MAP.cry[k]-=Math.ceil(take*0.5); if (MAP.cry[k]<0) MAP.cry[k]=0;
    var ot=MAP.ore[k];
    u.cargoV=(u.cargoV||0)+take*ORES[ot].deger; u.cargo+=take;
    if (ORE_MAT[ot]) { u.mat=u.mat||{}; u.mat[ORE_MAT[ot]]=(u.mat[ORE_MAT[ot]]||0)+take/30; }
    if (Math.random()<0.3) FX.parts.push({x:(u.hx+0.5)*T+(Math.random()-0.5)*20,y:(u.hy+0.5)*T+(Math.random()-0.5)*20,vx:0,vy:-20,l:0.6,m:0.6,s:2,c:'ore'+ot,g:0});
    if (u.cargo>=HCAP){ u.hs='ret'; u.path=null; }
    return;
  }
  if (u.hs==='ret'){
    var r=nearestOwn(u,'refinery'); if(!r){ halt(u); integrate(u,dt); return; }
    var dp=dockPoint(r); u.ref=r.id;
    var L2=followPath(u,dt,dp[0],dp[1],8); integrate(u,dt);
    if (L2<16 || rectDist(r,u.x,u.y)<34) { u.hs='unload'; }
    return;
  }
  if (u.hs==='unload'){
    halt(u); integrate(u,dt);
    var r2=byId(u.ref); if (!r2 || r2.team!==u.team){ u.hs='ret'; return; }
    if (tm.cr >= tm.cap && u.team===ME){ if (G.t-tm.fullWarn>20){ tm.fullWarn=G.t; HOOK.msg('Depo dolu! Silo yap ya da para harca.','bad'); } return; }
    var amt=Math.min(u.cargo, 70*dt), frac=amt/Math.max(1,u.cargo), val=(u.cargoV||0)*frac;
    u.cargo-=amt; u.cargoV-=val;
    var inc = val * (u.team!==ME ? [0.8,1,1.4][G.diff] : 1) * LAWS.vergi.secenek[tm.soc.laws.vergi].gelir;
    tm.cr += inc; if (u.team===ME && Math.random()<0.1) FX.texts.push({x:r2.x,y:r2.y-30,s:'+'+Math.round(inc*10),l:1,c:'#7f7'});
    if (u.mat && u.cargo<=0.5){ for (var m in u.mat){ tm.mat[m]+=Math.round(u.mat[m]); } u.mat={}; }
    if (u.cargo<=0.5){ u.cargo=0; u.cargoV=0; u.hs='seek'; }
  }
}
function findOre(u, maxR){
  var cx=Math.floor(u.x/T), cy=Math.floor(u.y/T), ref=nearestOwn(u,'refinery');
  if (u.hx!=null && !maxR && MAP.cry[idx(u.hx,u.hy)] && dist(u.hx,u.hy,cx,cy)<6) return [u.hx,u.hy];
  var best=null, bs=1e9, R=maxR||60;
  for (var r=0;r<=R;r+= (r<8?1:2)){
    for (var oy=-r;oy<=r;oy++) for (var ox=-r;ox<=r;ox++){ if(Math.abs(ox)!==r&&Math.abs(oy)!==r)continue; var x=cx+ox,y=cy+oy; if(!inMap(x,y))continue; var k=idx(x,y); if(!MAP.cry[k]||blockedTile(x,y))continue;
      var s=r + (ref? dist(x,y,ref.x/T,ref.y/T)*0.4 : 0) - ORES[MAP.ore[k]].deger*0.3; if(s<bs){bs=s;best=[x,y];} }
    if (best && r>4) break;
  }
  return best;
}
function nearestOwn(u, type){ var best=null, bd=1e9; G.ents.forEach(function(e){ if(e.k==='b'&&e.team===u.team&&(!type||e.type===type)&&e.bp>=1){ var d=dist(u.x,u.y,e.x,e.y); if(d<bd){bd=d;best=e;} } }); return best; }

/* ---------- işçi: odun / taş / ganimet ---------- */
function doGather(u, o, dt){
  var tm=teamOf(u.team);
  if (u.hs==='ret'){
    var b=nearestOwn(u); if(!b){ u.ord=null; return; }
    var L=followPath(u,dt,b.x,b.y+BLD[b.type].h*T/2+10,8); integrate(u,dt);
    if (rectDist(b,u.x,u.y)<22 || L===0){ for (var m in u.mat){ tm.mat[m]+=Math.round(u.mat[m]); } if(u.team===ME) FX.texts.push({x:u.x,y:u.y-14,s:'+'+Object.keys(u.mat).map(function(k){return Math.round(u.mat[k])+' '+MATS[k].ad;}).join(' '),l:1.4,c:'#fd8'}); u.mat={}; u.cargo=0; u.hs='go'; u.path=null; }
    return;
  }
  var k=idx(o.tx,o.ty), dc=MAP.deco[k];
  if (!dc || !(isTree(dc)||isStone(dc))){ var nx=findDeco(o.tx,o.ty, o.kind); if (nx){ o.tx=nx[0]; o.ty=nx[1]; u.path=null; return; } if (u.cargo>0) u.hs='ret'; else u.ord=null; return; }
  o.kind = isTree(dc)?'tree':'stone';
  var L2=followPath(u,dt,(o.tx+0.5)*T,(o.ty+0.5)*T,18); integrate(u,dt);
  if (dist(u.x,u.y,(o.tx+0.5)*T,(o.ty+0.5)*T)>26 && L2!==0) return;
  halt(u); u.ang=Math.atan2((o.ty+0.5)*T-u.y,(o.tx+0.5)*T-u.x);
  u.chan+=dt; if (Math.random()<0.15){ fxSpark((o.tx+0.5)*T,(o.ty+0.5)*T, isTree(dc)?'#c96':'#ccc'); HOOK.sound(isTree(dc)?'chop':'pick',u.x,u.y); }
  if (u.chan>=2.2){ u.chan=0; u.mat=u.mat||{}; var mk=isTree(dc)?'odun':'tas'; u.mat[mk]=(u.mat[mk]||0)+ (mk==='odun'?4:3); u.cargo+=1;
    if (mk==='tas' && Math.random()<0.2){ u.mat.demir=(u.mat.demir||0)+1; }
    if (u.cargo>=3){ MAP.deco[k]=0; HOOK.chunkDirty(o.tx,o.ty); G.decoCut=(G.decoCut||{}); G.decoCut[k]=G.t; u.hs='ret'; u.path=null; } }
}
function findDeco(cx,cy,kind){ for (var r=1;r<14;r++) for (var oy=-r;oy<=r;oy++) for (var ox=-r;ox<=r;ox++){ if(Math.abs(ox)!==r&&Math.abs(oy)!==r)continue; var x=cx+ox,y=cy+oy; if(!inMap(x,y))continue; var d=MAP.deco[idx(x,y)]; if(!d)continue; if(kind==='tree'?isTree(d):kind==='stone'?isStone(d):(isTree(d)||isStone(d))) return [x,y]; } return null; }
function autoGather(u){ var p=findDeco(Math.floor(u.x/T),Math.floor(u.y/T), Math.random()<0.5?'tree':'stone'); if(p) u.ord={k:'gather',tx:p[0],ty:p[1]}; }
function doLoot(u, o, dt){
  var L=G.loot[o.i]; if (!L || L.done){ u.ord=null; return; }
  var d=followPath(u,dt,L.x,L.y,10); integrate(u,dt);
  if (dist(u.x,u.y,L.x,L.y)>24 && d!==0) return;
  halt(u); u.chan+=dt; if (Math.random()<0.1) fxSpark(L.x,L.y,'#fd6');
  if (u.chan<3) return;
  u.chan=0; L.done=true; var tm=teamOf(u.team), gain=L.val; tm.cr+=gain;
  var extra=['demir','bakir','odun','tas','altin'][Math.floor(Math.random()*5)], q=1+Math.floor(Math.random()*4); tm.mat[extra]+=q;
  var msg='Yağma: +'+gain+' kredi, +'+q+' '+MATS[extra].ad;
  if (Math.random()<0.15){ tm.items.medkit++; msg+=', +1 Sağlık Kiti'; }
  if (u.team===ME){ HOOK.msg(msg,'good'); FX.texts.push({x:L.x,y:L.y-10,s:'+'+gain,l:1.5,c:'#fd6'}); HOOK.sound('ready'); }
  u.ord=null;
}
function doStudy(u, o, dt){
  var m=G.meteors.filter(function(x){return x.id===o.id;})[0]; if(!m || m.sample<=0){ u.ord=null; return; }
  var d=followPath(u,dt,m.x,m.y+30,12); integrate(u,dt);
  if (dist(u.x,u.y,m.x,m.y)>60 && d!==0) return;
  halt(u); u.ang=Math.atan2(m.y-u.y,m.x-u.x);
  var tm=teamOf(u.team), gain=dt*1.2; m.sample-=gain; tm.sci+=gain;
  if (Math.random()<0.1) FX.parts.push({x:m.x,y:m.y,vx:(u.x-m.x),vy:(u.y-m.y),l:1,m:1,s:2,c:'cyan',g:0});
  DISCOVERIES.forEach(function(D){ if (!tm.disc[D.k] && tm.sci>=D.puan){ tm.disc[D.k]=1; if(u.team===ME){ HOOK.msg('🔬 KEŞİF: '+D.ad+' — '+D.bilgi,'good'); HOOK.sound('ready'); }
    if (D.k==='meteorzirh') G.ents.forEach(function(e){ if(e.team===u.team && (e.k==='b'||UNT[e.type].armor!=='pi')){ e.mhp*=1.15; e.hp*=1.15; } }); } });
  // yakındaki hastaları iyileştir
}
function spreadVirus(u){ G.ents.forEach(function(e){ if(e!==u&&e.k==='u'&&UNT[e.type].armor==='pi'&&!UNT[e.type].horde&&!e.sick&&dist(e.x,e.y,u.x,u.y)<40){ if(!(e.team<2&&teamOf(e.team).disc.asi)){ e.sick=0.01; if(e.team===ME&&Math.random()<0.3) HOOK.msg('Uzay virüsü yayılıyor! Bilim insanları aşı bulmalı.','bad'); } } }); }

/* ---------- mutant sürüsü davranışı ---------- */
function hordeThink(u){
  if ((G.f+u.id)%45!==0) return;
  var best=null, bd=1e9;
  G.ents.forEach(function(e){ if(e.team>1) return; var d=dist(u.x,u.y,e.x,e.y)*(e.k==='b'?0.8:1); if(d<bd){bd=d;best=e;} });
  if (best) u.ord={k:'amove', x:best.x, y:best.y};
}

/* ---------- yapılar ---------- */
function updateBuilding(b, dt){
  var d=BLD[b.type];
  if (b.bp<1){ b.bp=Math.min(1,b.bp+dt/1.6); return; }
  b.anim+=dt;
  if (b.repair && b.hp<b.mhp && b.team<2){ var tm=teamOf(b.team), c=dt*d.cost*0.04+dt*2; if (tm.cr>=c){ tm.cr-=c; b.hp=Math.min(b.mhp,b.hp+dt*b.mhp*0.025); if(Math.random()<0.2) fxSpark(b.x+(Math.random()-0.5)*d.w*T, b.y-d.H+(Math.random()-0.5)*d.h*T,'#ff8'); } else b.repair=false; }
  if (b.hp<b.mhp*0.5 && Math.random()<dt*3) FX.parts.push({x:b.x+(Math.random()-0.5)*d.w*T*0.6, y:b.y-d.H, vx:6, vy:-14, l:2.5, m:2.5, s:5, c:b.hp<b.mhp*0.25?'fire':'smoke', g:-2});
  if (d.income && b.team<2){ var tm2=teamOf(b.team); if (tm2.cr<tm2.cap) tm2.cr+=d.income*dt; }
  if (d.wpn){
    if (b.cd>0) b.cd-=dt;
    var t=byId(b.tgt);
    if (!t || t.hp<=0 || !isEnemy(b.team,t.team) || edgeDist(b,t)>d.wpn.range*T || hiddenFrom(t,b.team)) { b.tgt=0; t=null; if ((G.f+b.id)%8===0){ t=acquire(b, d.wpn.range); if(t) b.tgt=t.id; } }
    if (t){ var ta=Math.atan2(t.y-(t.z||0)-b.y, t.x-b.x), dd=angDiff(b.tang,ta); b.tang+=clamp(dd,-5*dt,5*dt);
      if (b.cd<=0 && Math.abs(dd)<0.3){ var slow = b.team<2 && lowPower(b.team) ? 2.2 : 1; b.cd=d.wpn.rof*slow; fire(b,t,d.wpn,b.team); } }
  }
  if (d.sw && b.team<2){ var tm3=teamOf(b.team); if (!lowPower(b.team)) tm3.sw=Math.min(d.sw, tm3.sw+dt); }
}
function fireIon(team, x, y){
  var tm=teamOf(team); if (tm.sw < BLD.uplink.sw || !has(team,'uplink')) return false;
  tm.sw=0; G.strikes.push({x:x,y:y,t:3,team:team});
  HOOK.msg(team===ME?'İyon Topu ateşlendi!':'DİKKAT: Düşman İyon Topu ateşledi!', team===ME?'good':'bad'); HOOK.sound('alarm');
  return true;
}

/* ---------- uzaysal ızgara (hızlı komşu arama) ---------- */
var GRID_C=128, GRID_W=0, GH=null, GN=new Int32Array(4096), GU=[], GB=[];
function buildGrid(){
  GRID_W=Math.ceil(N*T/GRID_C); if (!GH || GH.length!==GRID_W*GRID_W) GH=new Int32Array(GRID_W*GRID_W);
  GH.fill(-1); GU.length=0; GB.length=0;
  for (var k=0;k<G.ents.length;k++){ var e=G.ents[k]; if (e.k==='b'){ GB.push(e); continue; }
    var n=GU.length; GU.push(e); if (n>=GN.length){ var nn=new Int32Array(GN.length*2); nn.set(GN); GN=nn; }
    var cx=clamp((e.x/GRID_C)|0,0,GRID_W-1), cy=clamp((e.y/GRID_C)|0,0,GRID_W-1), c=cy*GRID_W+cx; GN[n]=GH[c]; GH[c]=n; }
}
function gridQuery(x,y,r){
  var out=[];
  var x0=clamp(((x-r)/GRID_C)|0,0,GRID_W-1), x1=clamp(((x+r)/GRID_C)|0,0,GRID_W-1), y0=clamp(((y-r)/GRID_C)|0,0,GRID_W-1), y1=clamp(((y+r)/GRID_C)|0,0,GRID_W-1);
  for (var cy=y0;cy<=y1;cy++) for (var cx=x0;cx<=x1;cx++){ for (var i=GH[cy*GRID_W+cx]; i>=0; i=GN[i]) out.push(GU[i]); }
  var r2=r+120;
  for (var j=0;j<GB.length;j++){ var b=GB[j]; if (Math.abs(b.x-x)<r2 && Math.abs(b.y-y)<r2) out.push(b); }
  return out;
}
