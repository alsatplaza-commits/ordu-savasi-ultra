/* ORDU SAVAŞI: KOMUTA — dünya: harita üretimi, yol bulma, varlıklar */
var TER = {GRASS:0, DIRT:1, WATER:2, ROAD:3, ROCK:4, URBAN:5, PLAZA:6, BRIDGE:7, SAND:8};
var DECO_LIST = [null,'mese','cam','kavak','palmiye','calilik','kaktus','gelincik','papatya','lale','lavanta','aycicegi','tas','granit','bazalt'];
var DECO = {}; DECO_LIST.forEach(function(k,i){ if(k) DECO[k]=i; });
function decoInfo(d){ var k=DECO_LIST[d]; if(!k) return null; return FLORA[k] ? {k:k, f:FLORA[k], tas:false} : {k:k, f:STONES[k], tas:true}; }
function isTree(d){ var i=decoInfo(d); return i && !i.tas && (i.f.tur==='agac'||i.f.tur==='cali'); }
function isStone(d){ var i=decoInfo(d); return i && i.tas; }
var G = null;          // aktif oyun durumu
var MAP = null;        // harita (tohumdan yeniden üretilir)

function rng(seed){ var a = seed >>> 0; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function dist(ax,ay,bx,by){ var dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
function angDiff(a,b){ var d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; }
function idx(tx,ty){ return ty*N+tx; }
function inMap(tx,ty){ return tx>=0&&ty>=0&&tx<N&&ty<N; }

function makeNoise(R, cell){
  var g = Math.ceil(N/cell)+2, v = new Float32Array(g*g);
  for (var i=0;i<v.length;i++) v[i]=R();
  return function(x,y){
    var fx=x/cell, fy=y/cell, ix=Math.floor(fx), iy=Math.floor(fy), tx=fx-ix, ty=fy-iy;
    tx=tx*tx*(3-2*tx); ty=ty*ty*(3-2*ty);
    var a=v[iy*g+ix], b=v[iy*g+ix+1], c=v[(iy+1)*g+ix], d=v[(iy+1)*g+ix+1];
    return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;
  };
}

var BASES = [];

function genMap(seed){
  var SC=N/160, S=function(v){return Math.round(v*SC);};
  BASES=[{x:S(22),y:N-1-S(22)},{x:N-1-S(22),y:S(22)}];
  var R = rng(seed);
  var n1=makeNoise(R,22), n2=makeNoise(R,9), n3=makeNoise(R,30), n4=makeNoise(R,5);
  var ore=new Uint8Array(N*N), terr=new Uint8Array(N*N), cry=new Uint8Array(N*N), hgt=new Uint8Array(N*N), deco=new Uint8Array(N*N), shade=new Uint8Array(N*N);
  var x,y,i;
  for (y=0;y<N;y++) for (x=0;x<N;x++){
    i=idx(x,y);
    var h = n1(x,y)*0.65 + n2(x,y)*0.35, d3=n3(x,y), r=n2(x+400,y)*0.6+n4(x,y)*0.4;
    var t = TER.GRASS;
    if (d3>0.66) t = TER.SAND; else if (h>0.6 && n4(x,y)>0.5) t = TER.DIRT;
    if (h<0.2) t = TER.WATER; else if (h<0.24 && t!==TER.SAND) t = TER.SAND;
    if (r>0.8) t = TER.ROCK;
    terr[i]=t; shade[i]=Math.floor(n4(x*1.7,y*1.7)*255);
  }
  // Nehir: sol üstten sağ alta kıvrılan
  var ph = R()*6;
  for (x=-4;x<N+4;x+=0.25){
    var cy = x + Math.sin(x/17+ph)*9 + Math.sin(x/7)*3;
    var cx = x;
    // nehri ters köşegene çevir: (x, N-1-cy)
    var rx = cx, ry = N-1-cy;
    var w = 2.2 + Math.sin(x/11)*0.8;
    for (var oy=-4;oy<=4;oy++) for (var ox=-4;ox<=4;ox++){
      var tx=Math.round(rx+ox), ty=Math.round(ry+oy);
      if (!inMap(tx,ty)) continue;
      var dd=Math.sqrt(ox*ox+oy*oy);
      if (dd<w) { terr[idx(tx,ty)]=TER.WATER; deco[idx(tx,ty)]=0; }
      else if (dd<w+1.2 && terr[idx(tx,ty)]!==TER.WATER) terr[idx(tx,ty)]=TER.SAND;
    }
  }
  // nehir ters köşegende olunca üsler aynı tarafta kalır; üsleri ayırmak için nehri ana köşegene al
  // (yukarıdaki çizim üsleri ayırmıyor) -> ikinci kol: ana köşegen boyunca
  for (x=-4;x<N+4;x+=0.25){
    var yy = x + Math.sin(x/15+ph*2)*8;
    var w2 = 1.8 + Math.sin(x/9)*0.6;
    for (var oy2=-3;oy2<=3;oy2++) for (var ox2=-3;ox2<=3;ox2++){
      var tx2=Math.round(x+ox2), ty2=Math.round(yy+oy2);
      if (!inMap(tx2,ty2)) continue;
      var d2=Math.sqrt(ox2*ox2+oy2*oy2);
      if (d2<w2) { terr[idx(tx2,ty2)]=TER.WATER; deco[idx(tx2,ty2)]=0; }
      else if (d2<w2+1 && terr[idx(tx2,ty2)]!==TER.WATER) terr[idx(tx2,ty2)]=TER.SAND;
    }
  }
  // Şehirler (modern yerleşim): blok + cadde
  var towns = [{x:S(80),y:S(80),r:S(13)},{x:S(44),y:S(44),r:S(10)},{x:S(116),y:S(116),r:S(10)},{x:S(40),y:S(108),r:S(7)},{x:S(120),y:S(52),r:S(7)}];
  var lootSpots = [];
  towns.forEach(function(tw){
    for (var yy2=tw.y-tw.r; yy2<=tw.y+tw.r; yy2++) for (var xx=tw.x-tw.r; xx<=tw.x+tw.r; xx++){
      if (!inMap(xx,yy2)) continue;
      var dd=dist(xx,yy2,tw.x,tw.y); if (dd>tw.r) continue;
      var j=idx(xx,yy2);
      if (terr[j]===TER.WATER) continue;
      var bx=((xx-tw.x)%7+7)%7, by=((yy2-tw.y)%7+7)%7;
      deco[j]=0;
      if (bx<5 && by<5 && bx>0 && by>0 && R()<0.93 && dd<tw.r-1) { terr[j]=TER.URBAN; }
      else { terr[j]=TER.PLAZA; if (R()<0.05) lootSpots.push({x:xx,y:yy2}); }
    }
  });
  // blok yükseklikleri (aynı bloğa aynı yükseklik)
  var seen=new Uint8Array(N*N);
  for (i=0;i<N*N;i++){
    if (terr[i]!==TER.URBAN||seen[i]) continue;
    var hh = 14+Math.floor(R()*46), q=[i]; seen[i]=1;
    while(q.length){ var c=q.pop(); hgt[c]=hh; var cx2=c%N, cy2=(c/N)|0;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(o){ var nx=cx2+o[0], ny=cy2+o[1]; if(!inMap(nx,ny))return; var k=idx(nx,ny); if(!seen[k]&&terr[k]===TER.URBAN){seen[k]=1;q.push(k);} }); }
  }
  // Yollar (otoyol): üsler arası + yan yollar. Suyun üstünde köprü.
  function road(pts, wdt){
    for (var p=0;p<pts.length-1;p++){
      var a=pts[p], b=pts[p+1], L=dist(a.x,a.y,b.x,b.y);
      for (var s=0;s<=L;s+=0.3){
        var px=a.x+(b.x-a.x)*s/L, py=a.y+(b.y-a.y)*s/L;
        for (var oy=0;oy<wdt;oy++) for (var ox=0;ox<wdt;ox++){
          var tx=Math.floor(px)+ox, ty=Math.floor(py)+oy; if(!inMap(tx,ty))continue;
          var k=idx(tx,ty);
          terr[k] = (terr[k]===TER.WATER||terr[k]===TER.BRIDGE) ? TER.BRIDGE : TER.ROAD; deco[k]=0; hgt[k]=0;
        }
      }
    }
  }
  road([{x:S(24),y:S(135)},{x:S(44),y:S(110)},{x:S(58),y:S(96)},{x:S(80),y:S(80)},{x:S(102),y:S(62)},{x:S(118),y:S(44)},{x:S(135),y:S(24)}],2);
  road([{x:S(2),y:S(44)},{x:S(44),y:S(44)},{x:S(80),y:S(80)},{x:S(116),y:S(116)},{x:S(158),y:S(116)}],2);
  road([{x:S(44),y:S(2)},{x:S(44),y:S(44)},{x:S(40),y:S(108)},{x:S(24),y:S(135)}],2);
  road([{x:S(116),y:S(158)},{x:S(116),y:S(116)},{x:S(120),y:S(52)},{x:S(135),y:S(24)}],2);
  road([{x:S(40),y:S(108)},{x:S(80),y:S(80)},{x:S(120),y:S(52)}],2);
  // Üs alanlarını temizle
  BASES.forEach(function(b){
    for (var yy3=b.y-17;yy3<=b.y+17;yy3++) for (var xx3=b.x-17;xx3<=b.x+17;xx3++){
      if(!inMap(xx3,yy3))continue; var dd=dist(xx3,yy3,b.x,b.y); if(dd>16)continue;
      var k=idx(xx3,yy3); if (terr[k]!==TER.ROAD){ terr[k]= dd<12?TER.GRASS:(terr[k]===TER.WATER||terr[k]===TER.ROCK||terr[k]===TER.URBAN?TER.DIRT:terr[k]); } deco[k]= dd<13?0:deco[k]; hgt[k]=0;
    }
  });
  // Kristal alanları
  var fields = [{x:S(34),y:S(122),r:5},{x:S(12),y:S(124),r:4},{x:S(125),y:S(34),r:5},{x:S(146),y:S(36),r:4},
                {x:S(62),y:S(118),r:5},{x:S(98),y:S(42),r:5},{x:S(28),y:S(76),r:6},{x:S(132),y:S(84),r:6},{x:S(80),y:S(28),r:5},{x:S(80),y:S(132),r:5},{x:S(66),y:S(66),r:4},{x:S(94),y:S(94),r:4},{x:S(150),y:S(150),r:6},{x:S(10),y:S(10),r:6}];
  var extra=Math.round(SC*SC*8);
  for (var ef=0; ef<extra; ef++) fields.push({x:Math.floor(10+R()*(N-20)), y:Math.floor(10+R()*(N-20)), r:3+Math.floor(R()*4)});
  var fi=0;
  fields.forEach(function(f){
    var oreT = fi<4 ? 0 : [0,1,2,0,4,1,3,2,0,3][fi%10]; fi++;
    for (var yy4=f.y-f.r-1;yy4<=f.y+f.r+1;yy4++) for (var xx4=f.x-f.r-1;xx4<=f.x+f.r+1;xx4++){
      if(!inMap(xx4,yy4))continue; var dd=dist(xx4,yy4,f.x,f.y)+ (R()-0.5)*1.6; if(dd>f.r)continue;
      var k=idx(xx4,yy4); if (terr[k]===TER.WATER||terr[k]===TER.ROCK||terr[k]===TER.URBAN||terr[k]===TER.BRIDGE) continue;
      cry[k]=Math.floor(120+135*(1-dd/f.r)); ore[k]=oreT; deco[k]=0; if(terr[k]===TER.ROAD)continue; terr[k]=TER.DIRT;
    }
  });
  // Bağlantı kontrolü: iki üs arası yol yoksa düz yol aç
  var blockedT=function(k){ var t=terr[k]; return t===TER.WATER||t===TER.ROCK||t===TER.URBAN; };
  var vis=new Uint8Array(N*N), st=[idx(BASES[0].x,BASES[0].y)]; vis[st[0]]=1;
  while(st.length){ var c3=st.pop(), cx3=c3%N, cy3=(c3/N)|0; for (var d4=0;d4<4;d4++){ var nx3=cx3+[1,-1,0,0][d4], ny3=cy3+[0,0,1,-1][d4]; if(!inMap(nx3,ny3))continue; var k3=idx(nx3,ny3); if(!vis[k3]&&!blockedT(k3)){vis[k3]=1;st.push(k3);} } }
  if (!vis[idx(BASES[1].x,BASES[1].y)]) road([BASES[0],BASES[1]],3);
  // Ganimet noktaları (yağmalanacak araba / sandık / enkaz) + şehir dışı enkazlar
  for (var e=0;e<Math.round(26*SC*SC);e++){ var lx=Math.floor(8+R()*(N-16)), ly=Math.floor(8+R()*(N-16)); lootSpots.push({x:lx,y:ly}); }
  var loot=[];
  lootSpots.forEach(function(p){
    var k=idx(p.x,p.y); if (blockedT(k)||cry[k]) return;
    if (dist(p.x,p.y,BASES[0].x,BASES[0].y)<14||dist(p.x,p.y,BASES[1].x,BASES[1].y)<14) return;
    loot.push({x:(p.x+0.5)*T, y:(p.y+0.5)*T, kind:Math.floor(R()*3), val:150+Math.floor(R()*5)*70, ang:R()*6.28});
  });
  var derricks=[{x:S(70),y:S(126)},{x:S(90),y:S(33)},{x:S(20),y:S(88)},{x:S(138),y:S(70)},{x:S(88),y:S(72)},{x:S(60),y:S(20)},{x:S(100),y:S(140)}];
  derricks.forEach(function(d){ for(var yy5=d.y;yy5<d.y+2;yy5++)for(var xx5=d.x;xx5<d.x+2;xx5++){var k=idx(xx5,yy5); terr[k]=TER.DIRT; cry[k]=0; deco[k]=0; hgt[k]=0;} });
  // Doğa: ağaç, çalı, çiçek, taş (DECO kodları: DECO_LIST sırası)
  for (y=0;y<N;y++) for (x=0;x<N;x++){
    i=idx(x,y); var tt=terr[i]; if (deco[i]||cry[i]) { if(cry[i])deco[i]=0; continue; }
    if (tt!==TER.GRASS && tt!==TER.DIRT && tt!==TER.SAND) continue;
    var fo=n2(x+90,y+30), rr=R();
    if (tt===TER.GRASS){
      if (fo>0.6 && rr<0.6) deco[i]= fo>0.7 ? DECO.cam : (rr<0.3?DECO.mese:DECO.kavak);
      else if (rr<0.03) deco[i]=DECO.calilik;
      else if (rr<0.09) deco[i]=[DECO.gelincik,DECO.papatya,DECO.lale,DECO.lavanta][Math.floor(R()*4)];
      else if (rr<0.1) deco[i]=DECO.tas;
    } else if (tt===TER.DIRT){
      if (rr<0.05) deco[i]=DECO.granit; else if (rr<0.09) deco[i]=DECO.tas; else if (rr<0.12) deco[i]=DECO.calilik; else if (rr<0.15) deco[i]=DECO.aycicegi; else if (fo>0.65&&rr<0.4) deco[i]=DECO.cam;
    } else {
      if (rr<0.02) deco[i]=DECO.palmiye; else if (rr<0.035) deco[i]=DECO.kaktus; else if (rr<0.05) deco[i]=DECO.bazalt;
    }
  }
  // taşlık alanların kenarında kaya
  for (i=0;i<N*N;i++){ if(terr[i]===TER.ROCK){ var xx6=i%N, yy6=(i/N)|0; for(var d6=0;d6<4;d6++){ var k6=idx(clamp(xx6+[1,-1,0,0][d6],0,N-1),clamp(yy6+[0,0,1,-1][d6],0,N-1)); if(!deco[k6]&&terr[k6]!==TER.ROCK&&!terrBlocked(terr[k6])&&!cry[k6]&&R()<0.3) deco[k6]=DECO.granit; } } }
  return {towns:towns, seed:seed, ore:ore, terr:terr, cry:cry, hgt:hgt, deco:deco, shade:shade, loot:loot, derricks:derricks};
}

/* ---------- geçilebilirlik ---------- */
function terrBlocked(t){ return t===TER.WATER||t===TER.ROCK||t===TER.URBAN; }
var PF_FOOT=false; /* kışın donmuş nehir: sadece yaya geçebilir */
function blockedTile(tx,ty){ if(!inMap(tx,ty))return true; var k=idx(tx,ty), t=MAP.terr[k];
  if (G.occ[k]>0) return true;
  if (t===TER.WATER) return !(PF_FOOT && G.season===3);
  return t===TER.ROCK||t===TER.URBAN; }
/* Mevsim: 0 ilkbahar, 1 yaz, 2 sonbahar (çamur), 3 kış (kar, buz) */
var SEASONS=[{ad:'İlkbahar',ikon:'🌱',offroad:1, foot:1, regrow:2, sight:1, heat:1, night:0.70},
             {ad:'Yaz',ikon:'☀️',offroad:1.05, foot:1, regrow:1, sight:1.1, heat:1, night:0.76},
             {ad:'Sonbahar',ikon:'🍂',offroad:0.82, foot:0.95, regrow:1, sight:0.85, heat:1, night:0.66},
             {ad:'Kış',ikon:'❄️',offroad:0.72, foot:0.82, regrow:0, sight:0.9, heat:1.25, night:0.6}];
var SEASON_DAYS=3;
function speedMul(tx,ty, armor){
  if(!inMap(tx,ty))return 1; var t=MAP.terr[idx(tx,ty)], S=SEASONS[G.season||0];
  var paved = (t===TER.ROAD||t===TER.BRIDGE||t===TER.PLAZA);
  if (armor==='pi') return (t===TER.SAND?0.85:1) * (paved?1:S.foot) * (t===TER.WATER?0.6:1);
  if (paved) return 1.25 * (G.season===3?0.9:1);
  var m = S.offroad;
  if (t===TER.SAND) m*=0.8;
  if (MAP.cry[idx(tx,ty)]) m*=0.9;
  return m;
}

/* ---------- A* yol bulma ---------- */
var PF = (function(){
  var S=0, g, stamp, closed, par, cur=1, heap, hf, hn=0;
  function init(){ S=N*N; g=new Float32Array(S); stamp=new Uint32Array(S); closed=new Uint32Array(S); par=new Int32Array(S); heap=new Int32Array(S*8); hf=new Float32Array(S*8); cur=1; }
  function push(n,f){ var i=hn++; while(i>0){ var p=(i-1)>>1; if(hf[p]<=f)break; heap[i]=heap[p]; hf[i]=hf[p]; i=p; } heap[i]=n; hf[i]=f; }
  function pop(){ var top=heap[0], ln=heap[--hn], lf=hf[hn], i=0; for(;;){ var l=2*i+1; if(l>=hn)break; var r=l+1, c=(r<hn&&hf[r]<hf[l])?r:l; if(hf[c]>=lf)break; heap[i]=heap[c]; hf[i]=hf[c]; i=c; } heap[i]=ln; hf[i]=lf; return top; }
  var DX=[1,-1,0,0,1,1,-1,-1], DY=[0,0,1,-1,1,-1,1,-1], DC=[1,1,1,1,1.414,1.414,1.414,1.414];
  function nearestFree(tx,ty){
    if(!blockedTile(tx,ty))return [tx,ty];
    for(var r=1;r<12;r++) for(var oy=-r;oy<=r;oy++) for(var ox=-r;ox<=r;ox++){ if(Math.abs(ox)!==r&&Math.abs(oy)!==r)continue; if(!blockedTile(tx+ox,ty+oy))return [tx+ox,ty+oy]; }
    return [tx,ty];
  }
  function find(sx,sy,ex,ey,maxN,foot){
    if (S!==N*N) init();
    PF_FOOT=!!foot; cur++; hn=0; maxN=maxN||9000;
    sx=clamp(sx,0,N-1); sy=clamp(sy,0,N-1);
    var e=nearestFree(clamp(ex,0,N-1),clamp(ey,0,N-1)); ex=e[0]; ey=e[1];
    var s=idx(sx,sy), goal=idx(ex,ey);
    g[s]=0; stamp[s]=cur; par[s]=-1; push(s,0);
    var best=s, bestH=1e9, count=0;
    while(hn>0 && count<maxN){
      var n=pop(); if(closed[n]===cur)continue; closed[n]=cur; count++;
      if(n===goal){ best=n; break; }
      var nx=n%N, ny=(n/N)|0;
      var hh=Math.abs(nx-ex)+Math.abs(ny-ey); if(hh<bestH){bestH=hh;best=n;}
      for(var d=0;d<8;d++){
        var mx=nx+DX[d], my=ny+DY[d]; if(mx<0||my<0||mx>=N||my>=N)continue;
        var m=my*N+mx; if(closed[m]===cur)continue;
        if(blockedTile(mx,my) && m!==s)continue;
        if(d>=4 && (blockedTile(nx+DX[d],ny) || blockedTile(nx,ny+DY[d])))continue;
        var ng=g[n]+DC[d];
        if(stamp[m]!==cur || ng<g[m]){ stamp[m]=cur; g[m]=ng; par[m]=n; var ddx=Math.abs(mx-ex), ddy=Math.abs(my-ey); push(m, ng + (ddx+ddy) - 0.586*Math.min(ddx,ddy)); }
      }
    }
    PF_FOOT=false;
    var out=[], c=best; while(c!==-1 && c!==s){ out.push(c); c=par[c]; } out.reverse();
    // düzleştir (görüş hattı)
    var pts=out.map(function(k){return [(k%N+0.5)*T, (((k/N)|0)+0.5)*T];});
    if(pts.length<3)return pts;
    var sm=[], a=[(sx+0.5)*T,(sy+0.5)*T], i=0;
    while(i<pts.length){ var j=Math.min(pts.length-1,i+10); while(j>i && !los(a[0],a[1],pts[j][0],pts[j][1])) j--; sm.push(pts[j]); a=pts[j]; i=j+1; }
    return sm;
  }
  function los(x0,y0,x1,y1){
    var L=dist(x0,y0,x1,y1), st=Math.ceil(L/(T*0.35));
    for(var i=1;i<st;i++){ var px=x0+(x1-x0)*i/st, py=y0+(y1-y0)*i/st; if(blockedTile(Math.floor(px/T),Math.floor(py/T)))return false;
      // geniş araçlar için kenar kontrolü
      if(blockedTile(Math.floor((px+8)/T),Math.floor(py/T))||blockedTile(Math.floor((px-8)/T),Math.floor(py/T))||blockedTile(Math.floor(px/T),Math.floor((py+8)/T))||blockedTile(Math.floor(px/T),Math.floor((py-8)/T)))return false; }
    return true;
  }
  return {find:find, los:los, nearestFree:nearestFree};
})();
