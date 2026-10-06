/* ORDU SAVAŞI: KOMUTA — kendi 2.5B çizim motoru (Canvas): arazi parçaları, yapılar, birlikler, ışık, hava, sis */
var CV, CX, CAM={x:0,y:0,z:1}, VIEW={w:0,h:0,dpr:1}, QUALITY={dpr:1, parts:1, fauna:1, lights:true, weather:true};
var CHUNKS={}, CHUNK_LRU=[], CHUNK_MAX=64, SEASON_DRAWN=-1;
var FOG_CV=null, FOG_CTX=null, FOG_IMG=null, LIGHT_CV=null, LIGHT_CTX=null;
var SPR={};
var WEATHER=[];
var FAUNA_LIVE=[];

function hexA(h,a){ var r=parseInt(h.substr(1,2),16), g=parseInt(h.substr(3,2),16), b=parseInt(h.substr(5,2),16); return 'rgba('+r+','+g+','+b+','+a+')'; }
function shadeC(h, f){ var r=parseInt(h.substr(1,2),16), g=parseInt(h.substr(3,2),16), b=parseInt(h.substr(5,2),16); r=clamp(Math.round(r*f),0,255); g=clamp(Math.round(g*f),0,255); b=clamp(Math.round(b*f),0,255); return 'rgb('+r+','+g+','+b+')'; }

function initRender(canvas){
  CV=canvas; CX=CV.getContext('2d', {alpha:false});
  FOG_CV=document.createElement('canvas'); LIGHT_CV=document.createElement('canvas'); LIGHT_CTX=LIGHT_CV.getContext('2d');
  buildSprites();
  resize();
}
function resize(){
  var vv=window.visualViewport;
  VIEW.dpr = Math.min(window.devicePixelRatio||1, QUALITY.dpr);
  VIEW.w = Math.round(vv ? vv.width : window.innerWidth);
  VIEW.h = Math.round(vv ? vv.height : window.innerHeight);
  CV.width = Math.round(VIEW.w*VIEW.dpr); CV.height=Math.round(VIEW.h*VIEW.dpr);
  CV.style.width=VIEW.w+'px'; CV.style.height=VIEW.h+'px';
  LIGHT_CV.width=Math.ceil(VIEW.w/3); LIGHT_CV.height=Math.ceil(VIEW.h/3);
}
function resetFog(){ FOG_CV.width=N; FOG_CV.height=N; FOG_CTX=FOG_CV.getContext('2d'); FOG_IMG=FOG_CTX.createImageData(N,N); }
function invalidateChunks(){ CHUNKS={}; CHUNK_LRU=[]; }
function chunkDirty(tx,ty){ var cx=Math.floor(tx/CHUNK), cy=Math.floor(ty/CHUNK); for (var dy=0;dy<=1;dy++){ var k=cx+','+(cy-dy); delete CHUNKS[k+'|1']; delete CHUNKS[k+'|2']; } }

/* ---------- arazi renkleri (mevsime göre) ---------- */
var PAL = [
  {grass:[88,140,58], dirt:[128,104,70], sand:[196,178,128], water:[38,92,140], rock:[112,108,100], plaza:[150,150,146], road:[62,64,66]},
  {grass:[110,146,58], dirt:[140,112,72], sand:[210,188,130], water:[40,100,148], rock:[118,112,102], plaza:[156,154,148], road:[64,64,66]},
  {grass:[132,124,58], dirt:[110,86,56], sand:[186,164,118], water:[44,84,118], rock:[104,100,94], plaza:[140,140,136], road:[56,58,60]},
  {grass:[226,232,236], dirt:[200,204,210], sand:[214,214,212], water:[170,206,226], rock:[150,154,160], plaza:[196,200,204], road:[110,112,116]}
];
function terrColor(t, sh, x, y){
  var P=PAL[G.season], c;
  switch(t){ case TER.GRASS:c=P.grass;break; case TER.DIRT:c=P.dirt;break; case TER.SAND:c=P.sand;break; case TER.WATER:c=P.water;break; case TER.ROCK:c=P.rock;break; case TER.ROAD:case TER.BRIDGE:c=P.road;break; default:c=P.plaza; }
  var f=0.86+sh/255*0.26; if (G.season===3 && t===TER.ROAD) f*= (((x*7+y*13)%5)/40+0.95);
  return 'rgb('+Math.round(c[0]*f)+','+Math.round(c[1]*f)+','+Math.round(c[2]*f)+')';
}
function getChunk(cx,cy,res){
  var key=cx+','+cy+'|'+res, c=CHUNKS[key];
  if (c){ c.used=performance.now(); return c; }
  var S=CHUNK*T/res, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
  var g=cv.getContext('2d'); g.scale(1/res,1/res); g.translate(-cx*CHUNK*T, -cy*CHUNK*T);
  drawChunk(g, cx, cy);
  c={cv:cv, used:performance.now()}; CHUNKS[key]=c; CHUNK_LRU.push(key);
  if (CHUNK_LRU.length>CHUNK_MAX){ CHUNK_LRU.sort(function(a,b){ return (CHUNKS[a]?CHUNKS[a].used:0)-(CHUNKS[b]?CHUNKS[b].used:0); }); var old=CHUNK_LRU.shift(); delete CHUNKS[old]; }
  return c;
}
function drawChunk(g, cx, cy){
  var x0=cx*CHUNK, y0=cy*CHUNK, x, y, k, t;
  var M=MAP;
  // taban
  for (y=y0-1;y<y0+CHUNK+1;y++) for (x=x0-1;x<x0+CHUNK+1;x++){ if(!inMap(x,y))continue; k=idx(x,y); t=M.terr[k];
    g.fillStyle=terrColor(t===TER.URBAN?TER.PLAZA:t, M.shade[k], x, y); g.fillRect(x*T-0.5,y*T-0.5,T+1,T+1); }
  // yumuşak geçiş lekeleri + doku
  var R=rng(cx*7919+cy*104729+M.seed);
  for (y=y0;y<y0+CHUNK;y++) for (x=x0;x<x0+CHUNK;x++){ k=idx(x,y); t=M.terr[k];
    if (t===TER.GRASS||t===TER.DIRT||t===TER.SAND){
      for (var n=0;n<3;n++){ g.fillStyle=terrColor(t, (M.shade[k]+R()*80-40)|0, x,y); g.globalAlpha=0.5; g.beginPath(); g.arc(x*T+R()*T, y*T+R()*T, 6+R()*12, 0, 6.283); g.fill(); }
      g.globalAlpha=1;
      if (t===TER.GRASS && G.season!==3){ g.strokeStyle='rgba(30,60,20,0.25)'; g.lineWidth=1; g.beginPath(); for (var b=0;b<5;b++){ var gx=x*T+R()*T, gy=y*T+R()*T; g.moveTo(gx,gy); g.lineTo(gx+R()*2-1,gy-3-R()*3); } g.stroke(); }
      if (t===TER.DIRT){ g.fillStyle='rgba(60,40,20,0.25)'; for (var p=0;p<4;p++) g.fillRect(x*T+R()*T, y*T+R()*T, 2, 2); }
    }
    if (t===TER.WATER){
      var shore=false; for (var d=0;d<4;d++){ var nx=x+[1,-1,0,0][d], ny=y+[0,0,1,-1][d]; if(inMap(nx,ny)&&M.terr[idx(nx,ny)]!==TER.WATER&&M.terr[idx(nx,ny)]!==TER.BRIDGE) shore=true; }
      if (G.season===3){ g.strokeStyle='rgba(255,255,255,0.5)'; g.lineWidth=1; g.beginPath(); g.moveTo(x*T+R()*T,y*T+R()*T); g.lineTo(x*T+R()*T,y*T+R()*T); g.stroke(); }
      else { g.fillStyle='rgba(255,255,255,0.06)'; g.fillRect(x*T+R()*T, y*T+R()*T, 8, 1.5); }
      if (shore){ g.fillStyle= G.season===3?'rgba(255,255,255,0.35)':'rgba(220,240,255,0.18)'; g.fillRect(x*T+2,y*T+2,T-4,T-4); }
    }
    if (t===TER.ROAD||t===TER.BRIDGE){
      g.fillStyle='rgba(0,0,0,0.15)'; for (var q=0;q<3;q++) g.fillRect(x*T+R()*T, y*T+R()*T, 3, 2);
      // şerit çizgisi: komşu yol yönüne göre
      var ex=inMap(x+1,y)&&(M.terr[idx(x+1,y)]===TER.ROAD||M.terr[idx(x+1,y)]===TER.BRIDGE), ey=inMap(x,y+1)&&(M.terr[idx(x,y+1)]===TER.ROAD||M.terr[idx(x,y+1)]===TER.BRIDGE);
      if ((x+y)%3===0){ g.fillStyle= G.season===3?'rgba(255,255,255,0.4)':'rgba(240,210,90,0.7)'; if (ex) g.fillRect(x*T+T-6, y*T+T-1, 12, 2); else if (ey) g.fillRect(x*T+T-1, y*T+T-6, 2, 12); }
      if (t===TER.BRIDGE){ g.fillStyle='#6a6a6a'; g.fillRect(x*T,y*T,T,3); g.fillRect(x*T,y*T+T-3,T,3); g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(x*T,y*T+T,T,5); }
    }
    if (t===TER.PLAZA||t===TER.URBAN){ g.strokeStyle='rgba(0,0,0,0.08)'; g.strokeRect(x*T+0.5,y*T+0.5,T-1,T-1); }
    if (t===TER.ROCK){
      g.fillStyle='rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x*T+T/2+4,y*T+T/2+6,T*0.6,T*0.4,0,0,6.283); g.fill();
      var rc=PAL[G.season].rock; g.fillStyle='rgb('+rc.join(',')+')';
      g.beginPath(); g.moveTo(x*T+2,y*T+T-2); g.lineTo(x*T+6+R()*6,y*T-6-R()*10); g.lineTo(x*T+T*0.6,y*T-14-R()*8); g.lineTo(x*T+T-1,y*T+T*0.4); g.lineTo(x*T+T-2,y*T+T-2); g.closePath(); g.fill();
      g.fillStyle='rgba(255,255,255,0.15)'; g.beginPath(); g.moveTo(x*T+8,y*T-4); g.lineTo(x*T+T*0.6,y*T-12); g.lineTo(x*T+T*0.5,y*T+6); g.fill();
      if (G.season===3){ g.fillStyle='rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(x*T+T*0.5,y*T-8,8,4,0,0,6.283); g.fill(); }
    }
  }
  // dekor ve şehir blokları satır sırasıyla (aşağıdaki 3 satır yukarı taşabilir)
  for (y=y0;y<y0+CHUNK+3;y++) for (x=x0-1;x<x0+CHUNK+1;x++){ if(!inMap(x,y))continue; k=idx(x,y); t=M.terr[k];
    if (t===TER.URBAN) drawUrbanTile(g,x,y,k);
    var dc=M.deco[k]; if (dc) drawDeco(g, x, y, dc, R);
  }
}
function drawUrbanTile(g,x,y,k){
  var h=MAP.hgt[k], M=MAP, X=x*T, Y=y*T;
  var up = inMap(x,y-1)&&M.terr[idx(x,y-1)]===TER.URBAN, dn=inMap(x,y+1)&&M.terr[idx(x,y+1)]===TER.URBAN;
  var hue = (h*37)%60, wall = G.season===3 ? '#8a8e94' : 'hsl('+(20+hue)+',10%,'+(40+h%15)+'%)', roof = 'hsl('+(200+hue)+',6%,'+(52+h%18)+'%)';
  if (!dn){ g.fillStyle='rgba(0,0,0,0.3)'; g.fillRect(X+4, Y+T, T, 8); g.fillStyle=wall; g.fillRect(X, Y+T-h, T, h);
    // pencereler
    var lit = typeof isNight==='function' && G && isNight();
    for (var wy=Y+T-h+5; wy<Y+T-6; wy+=9) for (var wx=X+4; wx<X+T-4; wx+=8){ g.fillStyle = ((wx*13+wy*7+h)%5===0 && lit) ? '#ffd76a' : 'rgba(20,30,45,0.8)'; g.fillRect(wx, wy, 4, 5); } }
  g.fillStyle=roof; g.fillRect(X, Y-h, T, T);
  if (G.season===3){ g.fillStyle='rgba(240,245,250,0.85)'; g.fillRect(X+1,Y-h+1,T-2,T-2); }
  if (!up){ g.fillStyle='rgba(255,255,255,0.12)'; g.fillRect(X,Y-h,T,2); }
  if ((x*31+y*17)%11===0){ g.fillStyle='#777'; g.fillRect(X+8,Y-h+8,10,8); g.fillStyle='#555'; g.fillRect(X+10,Y-h+6,6,3); }
}
function drawDeco(g, x, y, dc, R){
  var info=decoInfo(dc); if(!info) return;
  var X=x*T+T/2+(((x*13+y*7)%9)-4), Y=y*T+T/2+(((x*7+y*11)%9)-4), f=info.f, se=G.season;
  if (info.tas){
    g.fillStyle='rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X+3,Y+3,f.r*1.3,f.r*0.8,0,0,6.283); g.fill();
    g.fillStyle=f.renk; g.beginPath(); g.ellipse(X,Y,f.r*1.2,f.r*0.9,0.4,0,6.283); g.fill();
    g.fillStyle='rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(X-f.r*0.3,Y-f.r*0.3,f.r*0.5,f.r*0.35,0.4,0,6.283); g.fill();
    if (se===3){ g.fillStyle='rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(X,Y-f.r*0.4,f.r*0.8,f.r*0.4,0,0,6.283); g.fill(); }
    return;
  }
  if (f.tur==='cicek'){ if (f.mevsim.indexOf(se)<0) return; for (var i=0;i<5;i++){ var px=X+((i*37+x)%17)-8, py=Y+((i*23+y)%15)-7; g.fillStyle='#3d6b2a'; g.fillRect(px,py,1,3); g.fillStyle=f.renk; g.beginPath(); g.arc(px,py,1.8,0,6.283); g.fill(); } return; }
  var col=f.renk[se], r=f.r;
  if (f.kaktus){ g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(X+2,Y+2,6,4); g.fillStyle=col; g.fillRect(X-2,Y-12,5,14); g.fillRect(X-7,Y-8,5,3); g.fillRect(X-7,Y-12,3,6); g.fillRect(X+3,Y-6,4,3); g.fillRect(X+5,Y-10,3,6); return; }
  if (f.tur==='cali'){ g.fillStyle='rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X+3,Y+3,r*1.3,r*0.7,0,0,6.283); g.fill(); g.fillStyle=col; for (var j=0;j<4;j++){ g.beginPath(); g.arc(X+(j-1.5)*3, Y-2-(j%2)*2, r*0.7, 0, 6.283); g.fill(); } return; }
  // ağaç: gölge + gövde + taç
  g.fillStyle='rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(X+r*0.8,Y+r*0.35,r*1.2,r*0.55,0.3,0,6.283); g.fill();
  g.fillStyle=f.govde; g.fillRect(X-2,Y-r*0.9,4,r*0.9+2);
  if (f.sivri){ for (var l=0;l<3;l++){ var ly=Y-r*0.6-l*r*0.55, lw=r*(1.1-l*0.28); g.fillStyle=shadeC(toHex(col), 0.85+l*0.12); g.beginPath(); g.moveTo(X-lw,ly); g.lineTo(X+lw,ly); g.lineTo(X,ly-r*0.9); g.closePath(); g.fill(); }
    if (se===3){ g.fillStyle='rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(X-r*0.5,Y-r*1.6); g.lineTo(X+r*0.5,Y-r*1.6); g.lineTo(X,Y-r*2.4); g.fill(); } return; }
  if (f.palm){ g.strokeStyle=col; g.lineWidth=3; for (var a=0;a<6;a++){ var an=a/6*6.283; g.beginPath(); g.moveTo(X,Y-r); g.quadraticCurveTo(X+Math.cos(an)*r*0.8, Y-r-6+Math.sin(an)*r*0.3, X+Math.cos(an)*r*1.2, Y-r+Math.sin(an)*r*0.6+4); g.stroke(); } return; }
  if (se===3 && f.renk[3]==='#d9e4e8' || se===3 && f.renk[3]==='#dfe8ea'){ // kışın yapraksız dallar
    g.strokeStyle=f.govde; g.lineWidth=1.5; for (var b2=0;b2<5;b2++){ var a2=-1.57+(b2-2)*0.5; g.beginPath(); g.moveTo(X,Y-r*0.8); g.lineTo(X+Math.cos(a2)*r, Y-r*0.8+Math.sin(a2)*r); g.stroke(); }
    g.fillStyle='rgba(255,255,255,0.5)'; g.beginPath(); g.arc(X,Y-r*1.3,r*0.5,0,6.283); g.fill(); return; }
  var c2=toHex(col);
  g.fillStyle=shadeC(c2,0.75); g.beginPath(); g.arc(X+2,Y-r*0.9,r,0,6.283); g.fill();
  g.fillStyle=c2; g.beginPath(); g.arc(X-1,Y-r*1.1,r*0.85,0,6.283); g.fill();
  g.fillStyle=shadeC(c2,1.2); g.beginPath(); g.arc(X-r*0.3,Y-r*1.4,r*0.4,0,6.283); g.fill();
}
function toHex(c){ return c.charAt(0)==='#'?c:'#777777'; }

/* ---------- sprite önbelleği (kristal / madenler) ---------- */
function buildSprites(){
  ORES.forEach(function(o,oi){ for (var lv=0;lv<4;lv++){ var cv=document.createElement('canvas'); cv.width=cv.height=48; var g=cv.getContext('2d');
    var R2=rng(oi*31+lv*7+1), n=2+lv;
    for (var i=0;i<n;i++){ var x=10+R2()*28, y=14+R2()*24, h=6+lv*3+R2()*6, w=3+R2()*3;
      if (oi===1||oi===2||oi===3){ g.fillStyle=shadeC(o.renk,0.6); g.beginPath(); g.ellipse(x,y,w*1.4,w,0,0,6.283); g.fill(); g.fillStyle=o.renk; g.beginPath(); g.ellipse(x-1,y-1,w,w*0.7,0,0,6.283); g.fill(); g.fillStyle='rgba(255,255,255,0.5)'; g.fillRect(x-2,y-2,2,2); }
      else { var gr=g.createLinearGradient(x,y-h,x,y); gr.addColorStop(0,'#fff'); gr.addColorStop(0.3,o.renk); gr.addColorStop(1,shadeC(o.renk,0.4));
        g.fillStyle=gr; g.beginPath(); g.moveTo(x-w,y); g.lineTo(x-w*0.4,y-h); g.lineTo(x+w*0.3,y-h*1.1); g.lineTo(x+w,y); g.closePath(); g.fill(); } }
    SPR['ore'+oi+'_'+lv]=cv; }
    var gl=document.createElement('canvas'); gl.width=gl.height=64; var gg=gl.getContext('2d'); var rg=gg.createRadialGradient(32,32,2,32,32,32); rg.addColorStop(0,o.isik+'0.55)'); rg.addColorStop(1,o.isik+'0)'); gg.fillStyle=rg; gg.fillRect(0,0,64,64); SPR['glow'+oi]=gl; });
  var lg=document.createElement('canvas'); lg.width=lg.height=128; var l2=lg.getContext('2d'), r3=l2.createRadialGradient(64,64,0,64,64,64); r3.addColorStop(0,'rgba(0,0,0,1)'); r3.addColorStop(0.6,'rgba(0,0,0,0.6)'); r3.addColorStop(1,'rgba(0,0,0,0)'); l2.fillStyle=r3; l2.fillRect(0,0,128,128); SPR.light=lg;
  var fg=document.createElement('canvas'); fg.width=fg.height=64; var f2=fg.getContext('2d'), r4=f2.createRadialGradient(32,32,0,32,32,32); r4.addColorStop(0,'rgba(255,240,200,1)'); r4.addColorStop(0.3,'rgba(255,170,60,0.8)'); r4.addColorStop(1,'rgba(255,80,0,0)'); f2.fillStyle=r4; f2.fillRect(0,0,64,64); SPR.fire=fg;
  var sg=document.createElement('canvas'); sg.width=sg.height=64; var s2=sg.getContext('2d'), r5=s2.createRadialGradient(32,32,0,32,32,32); r5.addColorStop(0,'rgba(90,90,90,0.55)'); r5.addColorStop(1,'rgba(90,90,90,0)'); s2.fillStyle=r5; s2.fillRect(0,0,64,64); SPR.smoke=sg;
}
