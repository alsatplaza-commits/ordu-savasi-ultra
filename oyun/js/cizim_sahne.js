/* ORDU SAVAŞI: KOMUTA — sahne çizimi: kamera, katmanlar, gece ışığı, hava durumu, sis, seçim */
var SEL=[], HOVER=null, GHOST=null, DRAGBOX=null, DRAGMOVE=null, TARGETING=null;
function worldToScreen(x,y){ return [(x-CAM.x)*CAM.z, (y-CAM.y)*CAM.z]; }
function screenToWorld(sx,sy){ return [sx/CAM.z+CAM.x, sy/CAM.z+CAM.y]; }
function clampCam(){
  var vw=VIEW.w/CAM.z, vh=VIEW.h/CAM.z;
  CAM.x=clamp(CAM.x, -vw*0.3, N*T-vw*0.7); CAM.y=clamp(CAM.y, -vh*0.3, N*T-vh*0.7);
}
function render(dt){
  var g=CX, z=CAM.z;
  if (SEASON_DRAWN!==G.season){ invalidateChunks(); SEASON_DRAWN=G.season; }
  g.setTransform(1,0,0,1,0,0); g.fillStyle='#0a0d10'; g.fillRect(0,0,CV.width,CV.height);
  var sx=(Math.random()-0.5)*FX.shake, sy=(Math.random()-0.5)*FX.shake;
  g.setTransform(z*VIEW.dpr,0,0,z*VIEW.dpr, (-CAM.x*z+sx)*VIEW.dpr, (-CAM.y*z+sy)*VIEW.dpr);
  var vx0=CAM.x, vy0=CAM.y, vx1=CAM.x+VIEW.w/z, vy1=CAM.y+VIEW.h/z;
  // 1) arazi parçaları
  var res = z<0.45?2:1;
  var cx0=Math.max(0,Math.floor(vx0/(CHUNK*T))), cy0=Math.max(0,Math.floor(vy0/(CHUNK*T))), cx1=Math.min(Math.ceil(N/CHUNK)-1,Math.floor(vx1/(CHUNK*T))), cy1=Math.min(Math.ceil(N/CHUNK)-1,Math.floor((vy1+80)/(CHUNK*T)));
  var built=0;
  for (var cy=cy0;cy<=cy1;cy++) for (var cx=cx0;cx<=cx1;cx++){
    var key=cx+','+cy+'|'+res, c=CHUNKS[key];
    if (!c && built>=3 && CHUNKS[cx+','+cy+'|'+(3-res)]) c=CHUNKS[cx+','+cy+'|'+(3-res)]; // akış: kare başına en çok 3 yeni parça
    if (!c) { if (built<4){ c=getChunk(cx,cy,res); built++; } }
    if (c) { c.used=performance.now(); g.drawImage(c.cv, cx*CHUNK*T, cy*CHUNK*T, CHUNK*T, CHUNK*T); }
    else { g.fillStyle='#2a3a22'; g.fillRect(cx*CHUNK*T, cy*CHUNK*T, CHUNK*T, CHUNK*T); }
  }
  // su parıltısı
  var tx0=Math.max(0,Math.floor(vx0/T)), ty0=Math.max(0,Math.floor(vy0/T)), tx1=Math.min(N-1,Math.ceil(vx1/T)), ty1=Math.min(N-1,Math.ceil(vy1/T));
  if (G.season!==3 && z>0.5){ g.fillStyle='rgba(255,255,255,0.07)'; for (var wy=ty0;wy<=ty1;wy++) for (var wx=tx0;wx<=tx1;wx++){ if (MAP.terr[wy*N+wx]===TER.WATER && ((wx*7+wy*13)%5===0)){ var ph=Math.sin(G.t*1.5+wx*0.7+wy*0.3); if (ph>0.3) g.fillRect(wx*T+8+ph*6, wy*T+12, 10, 1.5); } } }
  // 2) izler / yanıklar
  FX.decals.forEach(function(d){ if (d.x<vx0-100||d.x>vx1+100||d.y<vy0-100||d.y>vy1+100) return; drawDecal(g,d); });
  // 3) madenler
  var glow=[];
  for (var y=ty0;y<=ty1;y++) for (var x=tx0;x<=tx1;x++){ var k=y*N+x, a=MAP.cry[k]; if(!a) continue; var o=MAP.ore[k], lv=a>190?3:a>120?2:a>60?1:0;
    g.drawImage(SPR['ore'+o+'_'+lv], x*T-8, y*T-12, 48, 48); if (o===0||o>=4) glow.push(x,y,o); }
  g.globalCompositeOperation='lighter';
  var pul=0.75+0.25*Math.sin(G.t*2);
  g.globalAlpha=pul; for (var gi=0;gi<glow.length;gi+=3) g.drawImage(SPR['glow'+glow[gi+2]], glow[gi]*T-16, glow[gi+1]*T-16, 64, 64);
  g.globalAlpha=1; g.globalCompositeOperation='source-over';
  // 4) ganimet ve meteor
  G.loot.forEach(function(L){ if (L.done || L.x<vx0-40||L.x>vx1+40||L.y<vy0-40||L.y>vy1+40) return; if(!G.explored[idx(L.x/T|0,L.y/T|0)]) return; drawLoot(g,L); });
  G.meteors.forEach(function(m){ if (m.x<vx0-80||m.x>vx1+80||m.y<vy0-80||m.y>vy1+80) return; drawMeteorSite(g,m); });
  G.mines.forEach(function(m){ if (m.team!==ME) return; g.fillStyle='#333'; g.beginPath(); g.arc(m.x,m.y,4,0,6.283); g.fill(); g.fillStyle=Math.sin(G.t*6)>0?'#f33':'#600'; g.fillRect(m.x-1,m.y-1,2,2); });
  // 5) seçim halkaları (altta)
  SEL.forEach(function(e){ if (e.k!=='u'||e.dead) return; var d=UNT[e.type]; g.strokeStyle= e.team===ME?'rgba(120,255,140,0.9)':'rgba(255,120,120,0.9)'; g.lineWidth=1.5/z+0.5; g.beginPath(); g.ellipse(e.x,e.y+2,d.r+3,(d.r+3)*0.6,0,0,6.283); g.stroke(); });
  // 6) varlıklar (y sıralı)
  var list=[], air=[];
  for (var i=0;i<G.ents.length;i++){ var e=G.ents[i];
    var ex = e.k==='b' ? e.x : e.x, ey=e.y, pad = e.k==='b' ? BLD[e.type].w*T : 40;
    if (ex<vx0-pad||ex>vx1+pad||ey<vy0-pad||ey>vy1+pad+60) continue;
    if (!entVisible(e)) { if (e.k==='b' && G.explored[idx(e.tx,e.ty)]) list.push(e); continue; }
    if (e.k==='u' && UNT[e.type].air) air.push(e); else list.push(e); }
  list.sort(function(a,b){ return (a.k==='b'?(a.ty+BLD[a.type].h)*T:a.y) - (b.k==='b'?(b.ty+BLD[b.type].h)*T:b.y); });
  list.forEach(function(e){ if (e.k==='b') drawBuilding(g,e); else { if (UNT[e.type].stealth && e.team===ME) g.globalAlpha=0.55; drawUnit(g,e); g.globalAlpha=1; } });
  drawFauna(g, dt, vx0,vy0,vx1,vy1, false);
  // mermiler
  G.proj.forEach(function(p){
    if (p.k==='arty'){ g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.arc(p.x,p.y,3,0,6.283); g.fill(); g.fillStyle='#ffd27a'; g.beginPath(); g.arc(p.x,p.y-p.z,3.2,0,6.283); g.fill(); }
    else if (p.k==='rocket'){ g.save(); g.translate(p.x,p.y); g.rotate(p.a); g.fillStyle='#ddd'; g.fillRect(-5,-1.4,9,2.8); g.fillStyle='#fa4'; g.fillRect(-9,-1.2,4,2.4); g.restore(); }
    else if (p.k==='emp'){ g.strokeStyle='rgba(120,220,255,0.9)'; g.lineWidth=2; g.beginPath(); g.arc(p.x,p.y,6+Math.sin(G.t*30)*2,0,6.283); g.stroke(); }
    else { g.fillStyle='#ffe0a0'; g.beginPath(); g.arc(p.x,p.y,2.4,0,6.283); g.fill(); }
  });
  air.sort(function(a,b){return a.y-b.y;}).forEach(function(e){ drawUnit(g,e); });
  drawFauna(g, dt, vx0,vy0,vx1,vy1, true);
  // meteor düşüşü
  G.falls.forEach(function(f){ var p=f.t/f.T, hx=f.x+(1-p)*900, hy=f.y-(1-p)*1400; g.strokeStyle='rgba(255,180,80,0.8)'; g.lineWidth=10*p+2; g.beginPath(); g.moveTo(hx+120,hy-180); g.lineTo(hx,hy); g.stroke(); g.fillStyle='#fff3c0'; g.beginPath(); g.arc(hx,hy,6+p*8,0,6.283); g.fill();
    g.strokeStyle='rgba(255,80,40,'+(0.3+0.4*Math.sin(G.t*12))+')'; g.lineWidth=2; g.beginPath(); g.arc(f.x,f.y,60*(1-p)+20,0,6.283); g.stroke(); });
  G.strikes.forEach(function(s){ g.strokeStyle='rgba(120,230,255,'+(0.5+0.5*Math.sin(G.t*20))+')'; g.lineWidth=3; g.beginPath(); g.arc(s.x,s.y,5*T*(s.t/3),0,6.283); g.stroke(); });
  // 7) parçacıklar ve ışınlar
  drawParticles(g, vx0,vy0,vx1,vy1);
  FX.beams.forEach(function(b){ var al=b.l/b.m; if (b.glow){ g.globalCompositeOperation='lighter'; g.strokeStyle=b.c+(al*0.35)+')'; g.lineWidth=b.w*3; g.beginPath(); g.moveTo(b.x1,b.y1); g.lineTo(b.x2,b.y2); g.stroke(); }
    g.strokeStyle=b.c+al+')'; g.lineWidth=b.w; g.beginPath(); g.moveTo(b.x1,b.y1); g.lineTo(b.x2,b.y2); g.stroke(); g.globalCompositeOperation='source-over'; });
  // YZ dönüştürme ışını
  G.ents.forEach(function(u){ if (u.k==='u' && u.cv && entVisible(u)){ var c=byId(u.cv.id); if(!c) return; var w=Math.sin(G.t*20)*2; g.globalCompositeOperation='lighter'; g.strokeStyle='rgba(120,240,255,0.5)'; g.lineWidth=6+w; g.beginPath(); g.moveTo(u.x,u.y); g.lineTo(c.x,c.y-(c.z||0)); g.stroke(); g.strokeStyle='#dff'; g.lineWidth=1.5; g.stroke(); g.globalCompositeOperation='source-over';
    g.strokeStyle='#7ef'; g.lineWidth=3; g.beginPath(); g.arc(c.x,c.y-(c.z||0)-2,16,-1.57,-1.57+u.cv.p*6.283); g.stroke(); } });
  // 8) gece aydınlatması
  var nl=nightLevel();
  if (nl>0.02 && QUALITY.lights) drawNight(g, nl, vx0, vy0);
  // 9) hava durumu
  if (QUALITY.weather) drawWeather(g, dt, vx0,vy0,vx1,vy1);
  // 10) savaş sisi
  drawFog(g);
  // 11) arayüz katmanı (dünya koordinatlarında): can barları, hedef çizgileri, hayalet
  SEL.forEach(function(e){ if (e.dead) return; if (e.k==='b'){ var d=BLD[e.type], x0=e.tx*T, y0=e.ty*T-d.H, w=d.w*T, h=d.h*T+d.H; g.strokeStyle='#8f8'; g.lineWidth=2/z; var L=10; [[x0,y0,1,1],[x0+w,y0,-1,1],[x0,y0+h,1,-1],[x0+w,y0+h,-1,-1]].forEach(function(c){ g.beginPath(); g.moveTo(c[0]+L*c[2],c[1]); g.lineTo(c[0],c[1]); g.lineTo(c[0],c[1]+L*c[3]); g.stroke(); });
      if (e.rally && e.team===ME){ g.setLineDash([5,5]); g.strokeStyle='rgba(140,255,140,0.7)'; g.beginPath(); g.moveTo(e.x,e.y); g.lineTo(e.rally[0],e.rally[1]); g.stroke(); g.setLineDash([]); g.fillStyle='#8f8'; g.fillRect(e.rally[0]-3,e.rally[1]-10,2,10); g.fillRect(e.rally[0]-1,e.rally[1]-10,7,4); } }
    else if (e.team===ME && e.ord && (e.ord.x!=null) && z>0.4){ g.strokeStyle='rgba(120,255,140,0.35)'; g.lineWidth=1/z; g.beginPath(); g.moveTo(e.x,e.y); g.lineTo(e.ord.x,e.ord.y); g.stroke(); } });
  G.ents.forEach(function(e){ if (e.hp>=e.mhp && SEL.indexOf(e)<0 && HOVER!==e) return; if (!entVisible(e)) return; if (e.k==='b' && e.team===2 && SEL.indexOf(e)<0) return; drawHP(g,e,z); });
  FX.texts.forEach(function(t){ g.font='bold '+(12/Math.max(z,0.6))+'px sans-serif'; g.fillStyle='rgba(0,0,0,0.6)'; g.fillText(t.s,t.x+1,t.y+1); g.fillStyle=t.c; g.fillText(t.s,t.x,t.y); });
  if (GHOST) drawGhost(g);
  if (DRAGMOVE){
    g.strokeStyle='rgba(160,255,170,0.95)'; g.lineWidth=2/z; g.beginPath(); g.arc(DRAGMOVE.x, DRAGMOVE.y, 12, 0, 6.283); g.stroke();
    g.beginPath(); g.moveTo(DRAGMOVE.x-16, DRAGMOVE.y); g.lineTo(DRAGMOVE.x+16, DRAGMOVE.y); g.moveTo(DRAGMOVE.x, DRAGMOVE.y-16); g.lineTo(DRAGMOVE.x, DRAGMOVE.y+16); g.stroke();
    SEL.forEach(function(e){ if (e.dead || e.k!=='u' || e.team!==ME) return; g.strokeStyle='rgba(160,255,170,0.4)'; g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(DRAGMOVE.x, DRAGMOVE.y); g.stroke(); });
  }
  if (TARGETING && TARGETING.mx!=null){ g.strokeStyle= TARGETING.kind==='ion'?'rgba(120,230,255,0.9)':'rgba(255,220,80,0.9)'; g.lineWidth=2/z; var r= TARGETING.kind==='ion'?5*T:20; g.beginPath(); g.arc(TARGETING.mx,TARGETING.my,r,0,6.283); g.stroke(); g.beginPath(); g.moveTo(TARGETING.mx-r-8,TARGETING.my); g.lineTo(TARGETING.mx+r+8,TARGETING.my); g.moveTo(TARGETING.mx,TARGETING.my-r-8); g.lineTo(TARGETING.mx,TARGETING.my+r+8); g.stroke(); }
  g.setTransform(VIEW.dpr,0,0,VIEW.dpr,0,0);
  if (DRAGBOX){ g.strokeStyle='#8f8'; g.lineWidth=1; g.fillStyle='rgba(120,255,140,0.12)'; var bx=Math.min(DRAGBOX.x0,DRAGBOX.x1), by=Math.min(DRAGBOX.y0,DRAGBOX.y1), bw=Math.abs(DRAGBOX.x1-DRAGBOX.x0), bh=Math.abs(DRAGBOX.y1-DRAGBOX.y0); g.fillRect(bx,by,bw,bh); g.strokeRect(bx,by,bw,bh); }
}
function drawHP(g,e,z){
  var d=defOf(e), w = e.k==='b' ? d.w*T*0.8 : Math.max(16,d.r*2), x=e.x-w/2, y = e.k==='b' ? e.ty*T-d.H-8 : e.y-(e.z||0)-d.r-8, f=clamp(e.hp/e.mhp,0,1);
  var hh=Math.max(3,3/z);
  g.fillStyle='rgba(0,0,0,0.65)'; g.fillRect(x-1,y-1,w+2,hh+2);
  g.fillStyle= f>0.6?'#4f4':f>0.3?'#fd3':'#f43'; g.fillRect(x,y,w*f,hh);
  if (e.k==='u' && e.vet){ g.fillStyle='#ffd34d'; g.font=(9/Math.max(z,0.7))+'px sans-serif'; g.fillText('★'.repeat(e.vet), x, y-2); }
  if (e.k==='u' && e.cargo>0 && UNT[e.type].harvest){ g.fillStyle='#3f6'; g.fillRect(x,y+hh+1,w*e.cargo/HCAP,2); }
  if (e.k==='b' && e.team<2 && BLD[e.type].sw){ g.fillStyle='#7ef'; g.fillRect(x,y+hh+1,w*teamOf(e.team).sw/BLD[e.type].sw,2); }
  if (e.stun>0){ g.fillStyle='#7ef'; g.font='10px sans-serif'; g.fillText('⚡',x+w+2,y+4); }
  if (e.sick>0){ g.fillStyle='#c6f'; g.font='10px sans-serif'; g.fillText('☣',x-11,y+4); }
}
function drawDecal(g,d){
  if (d.k==='scorch'){ var gr=g.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r); gr.addColorStop(0,'rgba(20,15,10,0.55)'); gr.addColorStop(1,'rgba(20,15,10,0)'); g.fillStyle=gr; g.beginPath(); g.arc(d.x,d.y,d.r,0,6.283); g.fill(); }
  else if (d.k==='crater'){ g.fillStyle='rgba(30,22,18,0.75)'; g.beginPath(); g.ellipse(d.x,d.y,d.r,d.r*0.7,d.a,0,6.283); g.fill(); g.strokeStyle='rgba(90,70,60,0.8)'; g.lineWidth=6; g.stroke(); }
  else if (d.k==='rubble'){ g.fillStyle='rgba(40,38,36,0.7)'; g.beginPath(); g.ellipse(d.x,d.y,d.r,d.r*0.75,d.a,0,6.283); g.fill(); g.fillStyle='#5a5856'; for (var i=0;i<8;i++){ var a=d.a+i*0.8, r=d.r*(0.2+((i*37)%10)/14); g.fillRect(d.x+Math.cos(a)*r, d.y+Math.sin(a)*r*0.7, 5, 4); } }
  else if (d.k==='blood' || d.k==='goo'){ g.fillStyle= d.k==='blood'?'rgba(110,10,10,0.5)':'rgba(110,190,40,0.5)'; g.beginPath(); g.ellipse(d.x,d.y,d.r,d.r*0.6,d.a,0,6.283); g.fill(); }
}
function drawLoot(g,L){
  g.save(); g.translate(L.x,L.y); g.rotate(L.ang);
  if (L.kind===0){ g.fillStyle='rgba(0,0,0,0.3)'; g.fillRect(-11,-5,24,13); g.fillStyle='#7a4a32'; g.fillRect(-12,-7,24,13); g.fillStyle='#4a2c1e'; g.fillRect(-4,-6,10,11); g.fillStyle='#223'; g.fillRect(6,-5,3,9); }
  else if (L.kind===1){ g.fillStyle='#9a7038'; g.fillRect(-7,-7,14,14); g.strokeStyle='#5a4020'; g.lineWidth=2; g.strokeRect(-7,-7,14,14); g.beginPath(); g.moveTo(-7,-7); g.lineTo(7,7); g.stroke(); }
  else { g.fillStyle='#666'; g.fillRect(-9,-4,8,6); g.fillStyle='#777'; g.fillRect(0,-6,9,5); g.fillStyle='#555'; g.fillRect(-3,2,10,4); }
  g.restore();
  var p=0.5+0.5*Math.sin(G.t*3+L.x); g.strokeStyle='rgba(255,220,100,'+(0.25+p*0.4)+')'; g.lineWidth=1.5; g.beginPath(); g.arc(L.x,L.y,14+p*3,0,6.283); g.stroke();
}
function drawMeteorSite(g,m){
  g.fillStyle='#3a2f2a'; g.beginPath(); g.arc(m.x,m.y,12,0,6.283); g.fill(); g.fillStyle='#5a4a44'; g.beginPath(); g.arc(m.x-3,m.y-3,6,0,6.283); g.fill();
  var p=0.5+0.5*Math.sin(G.t*2.5); g.globalCompositeOperation='lighter'; g.drawImage(SPR.glow5, m.x-40, m.y-40, 80+p*10, 80+p*10); g.globalCompositeOperation='source-over';
  if (m.virus){ g.fillStyle='rgba(200,100,255,'+(0.2+p*0.2)+')'; g.beginPath(); g.arc(m.x,m.y,50+p*8,0,6.283); g.fill(); }
  if (m.sample>0){ g.fillStyle='#fff'; g.font='12px sans-serif'; g.fillText('🔬'+Math.ceil(m.sample),m.x-14,m.y-20); }
}
function drawParticles(g, vx0,vy0,vx1,vy1){
  var P=FX.parts;
  for (var i=0;i<P.length;i++){ var p=P[i]; if (p.d>0) continue; if (p.x<vx0-60||p.x>vx1+60||p.y<vy0-60||p.y>vy1+60) continue;
    var a=clamp(p.l/p.m,0,1);
    switch(p.c){
      case 'smoke': case 'steam': { var s=p.s*(1+(1-a)*2.5); g.globalAlpha=a*(p.c==='steam'?0.5:0.8); if (p.c==='steam') { g.fillStyle='rgba(235,235,235,0.5)'; g.beginPath(); g.arc(p.x,p.y,s,0,6.283); g.fill(); } else g.drawImage(SPR.smoke,p.x-s*2,p.y-s*2,s*4,s*4); break; }
      case 'fire': { var s2=p.s*(0.6+a*0.6); g.globalCompositeOperation='lighter'; g.globalAlpha=a; g.drawImage(SPR.fire,p.x-s2,p.y-s2,s2*2,s2*2); g.globalCompositeOperation='source-over'; break; }
      case 'flash': { g.globalCompositeOperation='lighter'; g.globalAlpha=a; g.fillStyle=p.col; g.beginPath(); g.arc(p.x,p.y,p.s*(0.5+a*0.5),0,6.283); g.fill(); g.globalCompositeOperation='source-over'; break; }
      case 'spark': { g.globalAlpha=a; g.fillStyle=p.col; g.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s); break; }
      case 'puff': { g.globalAlpha=a*0.8; g.fillStyle='#ffb050'; g.beginPath(); g.arc(p.x,p.y,p.s*(1.4-a),0,6.283); g.fill(); g.fillStyle='rgba(60,60,60,0.7)'; g.beginPath(); g.arc(p.x,p.y,p.s*(1.8-a)*0.8,0,6.283); g.fill(); break; }
      case 'ring': { g.globalAlpha=a; g.strokeStyle=p.col; g.lineWidth=3*a+1; g.beginPath(); g.arc(p.x,p.y,p.s*(1-a)+4,0,6.283); g.stroke(); break; }
      case 'cyan': { g.globalAlpha=a; g.fillStyle='#8ff'; g.fillRect(p.x-1,p.y-1,p.s,p.s); break; }
      default: if (p.c.indexOf('ore')===0){ g.globalAlpha=a; g.fillStyle=ORES[+p.c.slice(3)].renk; g.fillRect(p.x-1,p.y-1,2,2); }
    }
  }
  g.globalAlpha=1;
}
function drawNight(g, nl, vx0, vy0){
  var L=LIGHT_CTX, W=LIGHT_CV.width, H=LIGHT_CV.height, s=CAM.z/3;
  L.globalCompositeOperation='source-over'; L.clearRect(0,0,W,H);
  var blood = G.day%BLOOD_MOON===0;
  L.fillStyle = blood ? 'rgba(40,0,8,'+(0.62*nl)+')' : 'rgba(4,10,32,'+(0.66*nl)+')'; L.fillRect(0,0,W,H);
  L.globalCompositeOperation='destination-out';
  function light(x,y,r,a){ var sx=(x-vx0)*s, sy=(y-vy0)*s, rr=r*s; if (sx<-rr||sy<-rr||sx>W+rr||sy>H+rr) return; L.globalAlpha=a; L.drawImage(SPR.light, sx-rr, sy-rr, rr*2, rr*2); }
  G.ents.forEach(function(e){ if (!entVisible(e)) return;
    if (e.k==='b'){ var d=BLD[e.type]; if (e.team===2) return; light(e.x,e.y-d.H, d.light? d.light*T : (d.w+1)*T*0.8, d.light?1:0.75); }
    else if (e.team<2 && !UNT[e.type].horde){ var d2=UNT[e.type]; if (d2.armor!=='pi'){ light(e.x+Math.cos(e.ang)*40, e.y+Math.sin(e.ang)*40, 70, 0.8); } else light(e.x,e.y,36,0.5); } });
  FX.parts.forEach(function(p){ if (p.c==='fire'||p.c==='flash') light(p.x,p.y,p.s*4,0.5*clamp(p.l/p.m,0,1)); });
  FX.beams.forEach(function(b){ light(b.x2,b.y2,40,0.6); });
  for (var y=Math.max(0,Math.floor(vy0/T)); y<Math.min(N,Math.ceil((vy0+VIEW.h/CAM.z)/T)); y+=2) for (var x=Math.max(0,Math.floor(vx0/T)); x<Math.min(N,Math.ceil((vx0+VIEW.w/CAM.z)/T)); x+=2){ var k=y*N+x; if (MAP.cry[k] && (MAP.ore[k]===0||MAP.ore[k]>=4)) light(x*T+16,y*T+16,40,0.35); }
  FAUNA_LIVE.forEach(function(a){ if (a.k==='atesbocegi') light(a.x,a.y,14,0.5*(0.5+0.5*Math.sin(G.t*4+a.ph))); });
  L.globalAlpha=1; L.globalCompositeOperation='source-over';
  g.save(); g.setTransform(VIEW.dpr,0,0,VIEW.dpr,0,0); g.imageSmoothingEnabled=true; g.drawImage(LIGHT_CV,0,0,VIEW.w,VIEW.h); g.restore();
}
function drawWeather(g, dt, vx0,vy0,vx1,vy1){
  var se=G.season, rain = (se===2 || (se===0 && Math.sin(G.t/80)>0.4)), snow=se===3;
  if (!rain && !snow){ WEATHER.length=0; return; }
  var want = Math.round((snow?260:340) * QUALITY.parts);
  while (WEATHER.length<want) WEATHER.push({x:Math.random()*VIEW.w, y:Math.random()*VIEW.h, s:Math.random()});
  g.save(); g.setTransform(VIEW.dpr,0,0,VIEW.dpr,0,0);
  if (snow){ g.fillStyle='rgba(255,255,255,0.85)'; WEATHER.forEach(function(p){ p.y+=dt*(30+p.s*40); p.x+=dt*(Math.sin(G.t+p.s*10)*20+10); if(p.y>VIEW.h){p.y=-4;p.x=Math.random()*VIEW.w;} if(p.x>VIEW.w)p.x=0; g.fillRect(p.x,p.y,1.5+p.s*1.5,1.5+p.s*1.5); }); }
  else { g.strokeStyle='rgba(180,200,230,0.45)'; g.lineWidth=1; g.beginPath(); WEATHER.forEach(function(p){ p.y+=dt*(500+p.s*300); p.x+=dt*80; if(p.y>VIEW.h){p.y=-10;p.x=Math.random()*VIEW.w;} if(p.x>VIEW.w)p.x=0; g.moveTo(p.x,p.y); g.lineTo(p.x-3,p.y-12); }); g.stroke(); g.fillStyle='rgba(60,70,90,0.12)'; g.fillRect(0,0,VIEW.w,VIEW.h); }
  g.restore();
}
var FOG_T=0;
function drawFog(g){
  if (!FOG_IMG || FOG_CV.width!==N) resetFog();
  if (G.f!==FOG_T && G.f%8===0){ FOG_T=G.f; var D=FOG_IMG.data, v=G.vis, ex=G.explored;
    for (var i=0,j=0;i<N*N;i++,j+=4){ D[j]=6; D[j+1]=8; D[j+2]=12; D[j+3]= v[i]?0:(ex[i]?120:255); }
    FOG_CTX.putImageData(FOG_IMG,0,0); }
  g.imageSmoothingEnabled=true; g.drawImage(FOG_CV, 0,0,N,N, -T*0.5,-T*0.5, N*T, N*T);
}
function drawGhost(g){
  var d=BLD[GHOST.type]; if (GHOST.tx==null) return;
  var ok = GHOST.recipe ? (canCraft(ME,GHOST.recipe) && footprintFree(GHOST.type,GHOST.tx,GHOST.ty,ME)) : footprintFree(GHOST.type, GHOST.tx, GHOST.ty, ME);
  GHOST.ok=ok;
  g.globalAlpha=0.6; drawBuilding(g,{type:GHOST.type,team:ME,tx:GHOST.tx,ty:GHOST.ty,x:(GHOST.tx+d.w/2)*T,y:(GHOST.ty+d.h/2)*T,bp:1,tang:0,anim:0,hp:1,mhp:1},true); g.globalAlpha=1;
  for (var y=GHOST.ty;y<GHOST.ty+d.h;y++) for (var x=GHOST.tx;x<GHOST.tx+d.w;x++){ var k=inMap(x,y)?idx(x,y):-1; var bad = k<0 || terrBlocked(MAP.terr[k]) || G.occ[k] || (MAP.cry[k]&&!d.wall) || MAP.terr[k]===TER.BRIDGE || MAP.terr[k]===TER.WATER; g.fillStyle= ok&&!bad ? 'rgba(80,255,120,0.28)' : 'rgba(255,60,60,0.4)'; g.fillRect(x*T+1,y*T+1,T-2,T-2); }
}

/* ---------- canlı doğa (kamera çevresinde akış) ---------- */
var FAUNA_KEYS = Object.keys(FAUNA);
function drawFauna(g, dt, vx0,vy0,vx1,vy1, flying){
  if (!flying){
    // akış: görünür alanda yeterli hayvan yoksa üret, uzaktakileri sil
    var want = Math.round(28*QUALITY.fauna), night=isNight();
    for (var i=FAUNA_LIVE.length-1;i>=0;i--){ var a=FAUNA_LIVE[i]; if (a.x<vx0-400||a.x>vx1+400||a.y<vy0-400||a.y>vy1+400||a.dead) FAUNA_LIVE.splice(i,1); }
    var tries=0;
    while (FAUNA_LIVE.length<want && tries++<6){
      var k=FAUNA_KEYS[(Math.random()*FAUNA_KEYS.length)|0], f=FAUNA[k];
      if (f.mevsim.indexOf(G.season)<0) continue; if (f.sadeceGece && !night) continue; if (!f.gece && night && !f.ucan && Math.random()<0.7) continue;
      var x=vx0+Math.random()*(vx1-vx0), y=vy0+Math.random()*(vy1-vy0), tx=x/T|0, ty=y/T|0; if(!inMap(tx,ty)) continue;
      var t=MAP.terr[idx(tx,ty)];
      if (f.su ? t!==TER.WATER || G.season===3 : (!f.ucan && (terrBlocked(t)||t===TER.ROAD||t===TER.PLAZA||(f.zemin&&f.zemin.indexOf(t)<0)))) continue;
      if (!G.explored[idx(tx,ty)]) continue;
      var n=f.sur[0]+Math.floor(Math.random()*(f.sur[1]-f.sur[0]+1));
      for (var j=0;j<n;j++) FAUNA_LIVE.push({k:k, x:x+(Math.random()-0.5)*40, y:y+(Math.random()-0.5)*40, a:Math.random()*6.28, sp:0, ph:Math.random()*6, t:0, z:f.ucan?(f.bocek?6:30+Math.random()*20):0});
    }
  }
  var near=null;
  for (var q=0;q<FAUNA_LIVE.length;q++){ var an=FAUNA_LIVE[q], F=FAUNA[an.k]; if (!!F.ucan!==flying) continue;
    an.t-=dt; an.ph+=dt;
    // kaçış: yakındaki birlik
    if (F.kac && (G.f+q)%10===0){ near=gridQuery(an.x,an.y,F.kac); an.flee=null; for (var m=0;m<near.length;m++){ var e=near[m]; if (e.k==='u' && dist(e.x,e.y,an.x,an.y)<F.kac){ an.flee=Math.atan2(an.y-e.y,an.x-e.x); break; } } }
    if (an.flee!=null){ an.a=an.flee; an.sp=F.spd; }
    else if (an.t<=0){ an.t=1+Math.random()*3; an.a+= (Math.random()-0.5)*2.5; an.sp = F.bocek? F.spd : (Math.random()<0.4?0:F.spd*0.3); }
    var nx=an.x+Math.cos(an.a)*an.sp*dt, ny=an.y+Math.sin(an.a)*an.sp*dt;
    if (F.bocek){ nx+=Math.sin(an.ph*6)*0.6; ny+=Math.cos(an.ph*5)*0.6; }
    var ntx=nx/T|0, nty=ny/T|0;
    if (!F.ucan && inMap(ntx,nty)){ var tt=MAP.terr[idx(ntx,nty)]; if ((F.su && tt!==TER.WATER) || (!F.su && (terrBlocked(tt)||G.occ[idx(ntx,nty)]))) { an.a+=Math.PI*0.7; nx=an.x; ny=an.y; } }
    an.x=nx; an.y=ny;
    if (!tileVisible(an.x/T|0, an.y/T|0)) continue;
    drawAnimal(g, an, F);
  }
}
function drawAnimal(g, an, F){
  var x=an.x, y=an.y-an.z, s=F.boy, col=(G.season===3&&F.kis)?F.kis:F.renk;
  if (F.bocek){ if (an.k==='kelebek'){ var w=Math.abs(Math.sin(an.ph*14))*s*1.5+0.5; g.fillStyle=col; g.fillRect(x-w,y-1,w,2.5); g.fillRect(x,y-1,w,2.5); g.fillStyle='#222'; g.fillRect(x-0.4,y-1.5,0.8,3); }
    else if (an.k==='atesbocegi'){ var p=0.5+0.5*Math.sin(G.t*4+an.ph); g.fillStyle='rgba(220,255,110,'+p+')'; g.beginPath(); g.arc(x,y,1.6,0,6.283); g.fill(); }
    else { g.fillStyle=col; g.beginPath(); g.arc(x,y,1.3,0,6.283); g.fill(); g.fillStyle='rgba(255,255,255,0.6)'; g.fillRect(x-1.5,y-1.5,1,1); g.fillRect(x+0.5,y-1.5,1,1); }
    return; }
  if (an.k==='kus'){ g.fillStyle='rgba(0,0,0,0.15)'; g.fillRect(an.x+an.z*0.4,an.y+an.z*0.2,2,1); var fl=Math.sin(an.ph*10)*2; g.strokeStyle=col; g.lineWidth=1; g.beginPath(); g.moveTo(x-3,y-fl); g.lineTo(x,y); g.lineTo(x+3,y-fl); g.stroke(); return; }
  if (an.k==='balik'){ g.fillStyle='rgba(160,200,230,0.45)'; g.save(); g.translate(x,y); g.rotate(an.a); g.beginPath(); g.ellipse(0,0,s,s*0.4,0,0,6.283); g.fill(); g.fillRect(-s-2,-1,2,2); g.restore(); return; }
  g.save(); g.translate(x,y); g.rotate(an.a);
  g.fillStyle='rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(1,1.5,s*1.1,s*0.55,0,0,6.283); g.fill();
  g.fillStyle=col; g.beginPath(); g.ellipse(0,0,s,s*0.5,0,0,6.283); g.fill();
  g.beginPath(); g.arc(s*0.9,0,s*0.35,0,6.283); g.fill();
  if (F.benek){ g.fillStyle='#222'; g.fillRect(-s*0.3,-s*0.3,s*0.4,s*0.3); g.fillRect(s*0.2,0,s*0.3,s*0.3); }
  if (an.k==='geyik'){ g.strokeStyle='#5a3a1a'; g.lineWidth=1; g.beginPath(); g.moveTo(s*1.1,-2); g.lineTo(s*1.4,-5); g.moveTo(s*1.1,2); g.lineTo(s*1.4,5); g.stroke(); }
  if (an.k==='tavsan'){ g.fillStyle=col; g.fillRect(s*0.9,-2,s*0.7,1); g.fillRect(s*0.9,1,s*0.7,1); }
  if (an.k==='kurt' && isNight()){ g.fillStyle='#ff3'; g.fillRect(s*1.05,-1,1,1); g.fillRect(s*1.05,0.5,1,1); }
  g.restore();
}
