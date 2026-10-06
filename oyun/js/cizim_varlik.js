/* ORDU SAVAŞI: KOMUTA — yapı ve birlik çizimleri (prosedürel 2.5B) */
function block(g,x,y,w,h,H,top,front,edge){
  g.fillStyle=front; g.fillRect(x, y+h-H, w, H);
  g.fillStyle=top; g.fillRect(x, y-H, w, h);
  if (edge){ g.fillStyle='rgba(255,255,255,0.18)'; g.fillRect(x, y-H, w, 2); g.fillStyle='rgba(0,0,0,0.25)'; g.fillRect(x, y+h-H, w, 1.5); }
}
function cyl(g,cx,cy,r,H,top,side){
  g.fillStyle=side; g.fillRect(cx-r, cy-H, r*2, H); g.beginPath(); g.ellipse(cx,cy,r,r*0.45,0,0,Math.PI); g.fill();
  g.fillStyle=top; g.beginPath(); g.ellipse(cx,cy-H,r,r*0.45,0,0,6.283); g.fill();
}
function drawBuilding(g, b, ghost){
  var d=BLD[b.type], x=b.tx*T, y=b.ty*T, w=d.w*T, h=d.h*T, tc=TEAM_COLORS[b.team], td=TEAM_DARK[b.team], H=d.H*(ghost?1:Math.min(1,b.bp*1.2)), t=(G?G.t:0)+(b.anim||0);
  var win = G.season===3;
  // gölge
  if (!ghost){ g.fillStyle='rgba(0,0,0,0.32)'; g.beginPath(); g.moveTo(x+4,y+h); g.lineTo(x+w,y+h); g.lineTo(x+w+H*0.7,y+h-H*0.2); g.lineTo(x+w+H*0.7,y+H*0.3); g.lineTo(x+w,y); g.closePath(); g.fill(); }
  // zemin plakası
  if (!d.wall && b.type!=='lamp'){ g.fillStyle='#5b5e60'; g.fillRect(x+1,y+1,w-2,h-2); g.fillStyle='rgba(0,0,0,0.2)'; g.fillRect(x+1,y+h-4,w-2,3); g.strokeStyle=td; g.lineWidth=2; g.strokeRect(x+2,y+2,w-4,h-4); }
  var top='#9aa0a6', front='#6c7176';
  switch(b.type){
    case 'yard':
      block(g,x+10,y+18,w-20,h-30,H,'#a3a9ae','#6f757a',true);
      g.fillStyle=tc; g.fillRect(x+10,y+18-H+6,w-20,6);
      g.fillStyle='#4a4f53'; g.fillRect(x+20,y+30-H,30,22); g.fillStyle='#ffd34d'; g.font='bold 12px sans-serif'; g.fillText('H',x+30,y+46-H);
      // vinç kolu
      var a=Math.sin(t*0.4)*0.8; g.strokeStyle='#e0b020'; g.lineWidth=4; g.beginPath(); g.moveTo(x+w-30,y+30-H); g.lineTo(x+w-30,y+10-H-20); g.stroke();
      g.lineWidth=3; g.beginPath(); g.moveTo(x+w-30,y-H-10); g.lineTo(x+w-30+Math.cos(a)*50,y-H-10+Math.sin(a)*14); g.stroke();
      g.strokeStyle='#333'; g.lineWidth=1; g.beginPath(); g.moveTo(x+w-30+Math.cos(a)*44,y-H-10+Math.sin(a)*12); g.lineTo(x+w-30+Math.cos(a)*44,y-H+12); g.stroke();
      g.fillStyle='#ccc'; g.fillRect(x+w-50,y+h-28-H,30,16); g.fillStyle='#ff4040'; if (Math.sin(t*4)>0) g.fillRect(x+w-32,y-H-34,4,4);
      break;
    case 'power':
      block(g,x+6,y+40,w-12,h-48,H*0.6,'#8b9196','#62676b',true);
      [[x+28,y+46],[x+68,y+46]].forEach(function(p,i){ cyl(g,p[0],p[1],17,H+18,'#3c4246','#b7bcc0'); g.fillStyle='rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(p[0],p[1]-H-18,12,5,0,0,6.283); g.fill();
        if (!ghost && b.bp>=1 && Math.random()<0.25) FX.parts.push({x:p[0]+(Math.random()-0.5)*8,y:p[1]-H-20,vx:4,vy:-12,l:3,m:3,s:7,c:'steam',g:-1}); });
      g.fillStyle = lowPower(b.team)?'#a33':'#ffe14d'; g.globalAlpha=0.6+0.4*Math.sin(t*5); g.fillRect(x+12,y+h-18-H*0.6,w-24,4); g.globalAlpha=1;
      break;
    case 'refinery':
      block(g,x+8,y+8,w-50,h-30,H,'#9ba1a6','#6d7277',true);
      cyl(g,x+w-26,y+36,14,H+6,'#4f5559','#a9aeb2'); cyl(g,x+w-26,y+66,12,H-2,'#4f5559','#a9aeb2');
      g.fillStyle='#3a3f42'; g.fillRect(x+20,y+h-22,w-40,16); g.fillStyle='rgba(80,255,120,'+(0.4+0.3*Math.sin(t*3))+')'; g.fillRect(x+24,y+h-18,w-48,8);
      g.fillStyle=tc; g.fillRect(x+8,y+8-H+4,w-50,5);
      break;
    case 'silo':
      cyl(g,x+w/2,y+h/2+10,22,H+4,'#5a6064','#b4b9bd'); g.fillStyle='rgba(80,255,120,'+(0.5+0.3*Math.sin(t*2))+')'; g.beginPath(); g.ellipse(x+w/2,y+h/2+10-H-4,12,5,0,0,6.283); g.fill();
      g.fillStyle=tc; g.fillRect(x+w/2-22,y+h/2+6-H/2,44,4);
      break;
    case 'barracks':
      block(g,x+8,y+18,w-16,h-30,H,'#8a8f6e','#5f6449',true);
      g.fillStyle='#6e7357'; g.beginPath(); g.moveTo(x+8,y+18-H); g.lineTo(x+w/2,y+6-H); g.lineTo(x+w-8,y+18-H); g.fill();
      g.fillStyle='#2a2d22'; g.fillRect(x+w/2-10,y+h-12-H,20,H); // kapı
      g.strokeStyle='#444'; g.lineWidth=2; g.beginPath(); g.moveTo(x+16,y+20-H); g.lineTo(x+16,y-H-24); g.stroke();
      g.fillStyle=tc; g.beginPath(); g.moveTo(x+16,y-H-24); g.lineTo(x+34+Math.sin(t*3)*3,y-H-19); g.lineTo(x+16,y-H-14); g.fill();
      break;
    case 'factory':
      block(g,x+6,y+14,w-12,h-26,H,'#8f959a','#62676c',true);
      g.strokeStyle='rgba(0,0,0,0.2)'; g.lineWidth=2; for (var i=0;i<6;i++){ g.beginPath(); g.moveTo(x+12+i*18,y+14-H); g.lineTo(x+12+i*18,y+h-12-H); g.stroke(); }
      g.fillStyle='#2b2f33'; g.fillRect(x+w/2-26,y+h-12-H+4,52,H-4); g.fillStyle='#ffcc33'; for (var s=0;s<5;s++) g.fillRect(x+w/2-26+s*12,y+h-12-H+4,6,3);
      g.fillStyle=tc; g.fillRect(x+6,y+14-H,w-12,6);
      cyl(g,x+w-22,y+28,6,H+20,'#333','#777'); if (!ghost && Math.random()<0.15) FX.parts.push({x:x+w-22,y:y+28-H-22,vx:6,vy:-14,l:2.5,m:2.5,s:5,c:'smoke',g:-1});
      break;
    case 'airfield':
      g.fillStyle='#45494c'; g.fillRect(x+6,y+10,w-12,h-20); g.strokeStyle='#ddd'; g.setLineDash([10,8]); g.lineWidth=2; g.beginPath(); g.moveTo(x+14,y+h/2); g.lineTo(x+w-50,y+h/2); g.stroke(); g.setLineDash([]);
      g.strokeStyle='#ffd34d'; g.beginPath(); g.arc(x+w-70,y+h/2,14,0,6.283); g.stroke();
      block(g,x+w-40,y+16,28,h-36,H+22,'#9ba1a6','#6d7277',true);
      g.fillStyle='rgba(120,200,255,0.8)'; g.fillRect(x+w-38,y+16-H-22,24,8);
      g.fillStyle=tc; g.fillRect(x+w-40,y+h-20-H-22+H+22-6,28,4);
      break;
    case 'armory':
      block(g,x+8,y+14,w-16,h-24,H,'#7f866e','#585e4b',true);
      g.fillStyle='#454a3a'; g.fillRect(x+18,y+20-H,24,18); g.fillRect(x+50,y+20-H,24,18);
      g.fillStyle='#ffd34d'; g.fillRect(x+28,y+26-H,4,6); g.fillRect(x+60,y+26-H,4,6);
      g.fillStyle='#8a6a3a'; g.fillRect(x+8,y+h-14,12,10); g.fillRect(x+22,y+h-12,10,8);
      g.fillStyle=tc; g.fillRect(x+8,y+14-H,w-16,5);
      break;
    case 'lab':
      block(g,x+8,y+18,w-16,h-26,H,'#c7ccd0','#8b9094',true);
      var gr=g.createRadialGradient(x+w/2-6,y+h/2-H-8,2,x+w/2,y+h/2-H,24); gr.addColorStop(0,'#e8ffff'); gr.addColorStop(0.5,'rgba(90,200,255,0.9)'); gr.addColorStop(1,'rgba(30,90,140,0.9)');
      g.fillStyle=gr; g.beginPath(); g.arc(x+w/2,y+h/2-H+4,22,Math.PI,0); g.fill();
      g.strokeStyle='#ddd'; g.lineWidth=1.5; g.beginPath(); g.moveTo(x+w-18,y+20-H); g.lineTo(x+w-18,y-H-16); g.stroke(); g.fillStyle='#f44'; g.beginPath(); g.arc(x+w-18,y-H-16,2.5,0,6.283); g.fill();
      g.fillStyle=tc; g.fillRect(x+8,y+h-8-H,w-16,4);
      break;
    case 'uplink':
      block(g,x+10,y+30,w-20,h-38,H*0.6,'#9ba1a6','#6d7277',true);
      var da=t*0.3; g.save(); g.translate(x+w/2,y+h/2-H); g.rotate(da);
      g.fillStyle='#d7dcdf'; g.beginPath(); g.ellipse(0,0,32,16,0,0,6.283); g.fill(); g.fillStyle='#9aa'; g.beginPath(); g.ellipse(0,0,24,11,0,0,6.283); g.fill();
      g.strokeStyle='#555'; g.lineWidth=2; g.beginPath(); g.moveTo(0,0); g.lineTo(0,-22); g.stroke(); g.restore();
      if (b.team<2){ var ch=teamOf(b.team).sw/d.sw; g.strokeStyle='rgba(120,230,255,0.9)'; g.lineWidth=3; g.beginPath(); g.arc(x+w/2,y+h/2-H,38,-1.57,-1.57+ch*6.283); g.stroke(); }
      break;
    case 'tower_mg': case 'tower_cannon': case 'tower_aa':
      var cx=x+w/2, cy=y+h/2;
      if (b.type==='tower_mg'){ cyl(g,cx,cy+8,11,H,'#8d9396','#5f6568'); }
      else block(g,x+4,y+6,w-8,h-10,H,'#8d9396','#5f6568',true);
      g.save(); g.translate(cx, cy-H+ (b.type==='tower_mg'?8:4)); g.rotate(b.tang);
      if (b.type==='tower_mg'){ g.fillStyle='#4c5256'; g.beginPath(); g.arc(0,0,7,0,6.283); g.fill(); g.fillStyle='#222'; g.fillRect(4,-2,14,2); g.fillRect(4,1,14,2); }
      else if (b.type==='tower_cannon'){ g.fillStyle='#50565a'; g.fillRect(-14,-12,26,24); g.fillStyle='#2e3235'; g.fillRect(8,-3,30,6); g.fillStyle=tc; g.fillRect(-14,-12,26,4); }
      else { g.fillStyle='#50565a'; g.fillRect(-10,-12,20,24); g.fillStyle='#ddd'; for (var m=0;m<3;m++){ g.fillRect(6,-10+m*7,14,4); } g.fillStyle='#f44'; g.fillRect(18,-10,3,4); g.fillRect(18,-3,3,4); g.fillRect(18,4,3,4); }
      g.restore();
      g.fillStyle=tc; g.fillRect(cx-6,cy-H+ (b.type==='tower_mg'?14:-8),12,3);
      break;
    case 'wall': case 'barricade':
      var con = function(dx,dy){ var k=idx(b.tx+dx,b.ty+dy); var o=G.occ[k]&&G.map[G.occ[k]]; return o && BLD[o.type].wall; };
      var wc = b.type==='wall' ? ['#b5b8ba','#7d8184'] : ['#8a6a3e','#5e4524'];
      block(g,x+6,y+6,T-12,T-12,H,wc[0],wc[1],true);
      if (con(1,0)) block(g,x+T/2,y+8,T/2+2,T-16,H,wc[0],wc[1]);
      if (con(0,1)) block(g,x+8,y+T/2,T-16,T/2+2,H,wc[0],wc[1]);
      if (win){ g.fillStyle='rgba(255,255,255,0.7)'; g.fillRect(x+6,y+6-H,T-12,3); }
      break;
    case 'lamp':
      g.fillStyle='#444'; g.fillRect(x+T/2-2,y+T/2-H,4,H); g.fillStyle=isNight()?'#fff6c0':'#bbb'; g.beginPath(); g.arc(x+T/2,y+T/2-H,5,0,6.283); g.fill();
      break;
    case 'derrick':
      g.fillStyle='#3a3226'; g.fillRect(x+4,y+4,w-8,h-8);
      var pa=Math.sin(t*2)*0.35; g.strokeStyle='#666'; g.lineWidth=3; g.beginPath(); g.moveTo(x+20,y+h-10); g.lineTo(x+32,y+14-H); g.lineTo(x+44,y+h-10); g.stroke();
      g.save(); g.translate(x+32,y+14-H); g.rotate(pa); g.fillStyle=b.team===2?'#d8a020':tc; g.fillRect(-26,-4,48,8); g.fillStyle='#333'; g.fillRect(-30,-8,10,16); g.restore();
      g.fillStyle='#111'; g.beginPath(); g.ellipse(x+w-14,y+h-14,6,3,0,0,6.283); g.fill();
      break;
  }
  if (win && !d.wall && b.type!=='lamp' && !ghost){ g.fillStyle='rgba(245,248,252,0.55)'; g.fillRect(x+10,y+12-H,w-24,6); }
  // inşa animasyonu
  if (!ghost && b.bp<1){ g.strokeStyle='rgba(255,220,80,0.9)'; g.lineWidth=2; g.setLineDash([6,4]); g.strokeRect(x+2,y+2-H,w-4,h-4+H); g.setLineDash([]); if(Math.random()<0.5) fxSpark(x+Math.random()*w, y+Math.random()*h-H,'#ffd'); }
}

function drawUnit(g, u){
  var d=UNT[u.type], tc=TEAM_COLORS[u.team], td=TEAM_DARK[u.team], x=u.x, y=u.y, a=u.ang, t=G.t;
  var z=u.z||0, snow=G.season===3;
  if (d.air){ // gölge
    g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x+z*0.5,y+z*0.25,d.r*0.9,d.r*0.5,0,0,6.283); g.fill(); y-=z; }
  else if (d.armor!=='pi' && !d.horde){ g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x+3,y+4,d.r*1.05,d.r*0.75,a,0,6.283); g.fill(); }
  g.save(); g.translate(x,y);
  if (u.stun>0){ g.globalAlpha=0.8; }
  switch(u.type){
    case 'rifle': case 'rocket': case 'agent': case 'worker': case 'scientist': {
      var bob=Math.sin(t*12+u.id)*(u.s>4?1.2:0);
      g.rotate(a);
      g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(1,2,5,3.5,0,0,6.283); g.fill();
      var body = u.type==='scientist'?'#f2f2f2': u.type==='worker'?'#e3a52a': u.type==='agent'?'#2a2a2a':(snow?'#d8dde2':'#4e5b3a');
      g.fillStyle=body; g.beginPath(); g.ellipse(0,0,3.6,5,0,0,6.283); g.fill();
      g.fillStyle=tc; g.fillRect(-2,-5,4,2);
      g.fillStyle= u.type==='agent'?'#111':'#e0b48a'; g.beginPath(); g.arc(1+bob*0.3,0,2.6,0,6.283); g.fill();
      if (u.type==='rifle'){ g.fillStyle='#222'; g.fillRect(2,1.5,8,1.6); }
      if (u.type==='rocket'){ g.fillStyle='#4a5'; g.fillRect(-2,2,12,2.6); }
      if (u.type==='worker'){ g.fillStyle='#ccc'; g.fillRect(3,-3,6,1.6); g.fillStyle='#ffd23f'; g.beginPath(); g.arc(1,0,2.7,Math.PI,0); g.fill(); }
      if (u.type==='scientist'){ g.fillStyle='#6cf'; g.fillRect(3,2,4,3); }
      break; }
    case 'mutant': case 'runner': case 'brute': case 'alien': {
      var s= u.type==='brute'?2.2:u.type==='runner'?0.9:1, wob=Math.sin(t*9+u.id)*0.4;
      g.rotate(a+wob*0.2);
      if (u.type==='alien'){ g.fillStyle='#4a2a5a'; for (var l=0;l<6;l++){ var la=(l/6)*6.283+Math.sin(t*14+l)*0.3; g.fillRect(Math.cos(la)*5-1,Math.sin(la)*5-1,Math.cos(la)*4+2,2); } g.fillStyle='#8a3fbf'; g.beginPath(); g.ellipse(0,0,7,5,0,0,6.283); g.fill(); g.fillStyle='#d7f'; g.beginPath(); g.arc(4,0,2,0,6.283); g.fill(); break; }
      g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(1,2,5*s,3.5*s,0,0,6.283); g.fill();
      g.fillStyle= u.type==='brute'?'#5f7a3a':'#6f8a4a'; g.beginPath(); g.ellipse(0,0,4*s,5.5*s,0,0,6.283); g.fill();
      g.fillStyle='#8aa060'; g.fillRect(2*s,-5*s,4*s,2*s); g.fillRect(2*s,3*s,4*s,2*s);
      g.fillStyle='#a8c080'; g.beginPath(); g.arc(1.5*s,0,2.7*s,0,6.283); g.fill();
      g.fillStyle= isNight()?'#ff3a2a':'#600'; g.fillRect(3*s,-1.2*s,1.2*s,1*s); g.fillRect(3*s,0.6*s,1.2*s,1*s);
      break; }
    case 'harvester': {
      g.rotate(a);
      g.fillStyle='#2a2a2a'; g.fillRect(-15,-12,30,4); g.fillRect(-15,8,30,4);
      g.fillStyle=snow?'#c8c8b0':'#c9a227'; g.fillRect(-14,-9,28,18);
      g.fillStyle='#8a6d10'; g.fillRect(-12,-7,14,14);
      var fill=u.cargo/HCAP; g.fillStyle=ORES[0].renk; g.globalAlpha=0.85; g.fillRect(-11,-6,12*fill,12); g.globalAlpha=1;
      g.fillStyle='#555'; g.fillRect(14,-10,5,20); g.fillStyle='#777'; for (var s2=0;s2<4;s2++) g.fillRect(18,-9+s2*5,3,3);
      g.fillStyle='#9cd'; g.fillRect(5,-6,6,6); g.fillStyle=tc; g.fillRect(-14,-9,28,3);
      break; }
    case 'jeep': {
      g.rotate(a);
      g.fillStyle='#1d1d1d'; g.fillRect(-9,-8,6,3); g.fillRect(5,-8,6,3); g.fillRect(-9,5,6,3); g.fillRect(5,5,6,3);
      g.fillStyle=snow?'#d0d4d8':'#6e7650'; g.fillRect(-10,-6,21,12); g.fillStyle='#4b5136'; g.fillRect(-2,-5,7,10); g.fillStyle='#9cd'; g.fillRect(5,-5,2,10);
      g.fillStyle=tc; g.fillRect(-10,-6,4,12);
      g.rotate(u.tang-a); g.fillStyle='#333'; g.beginPath(); g.arc(-3,0,3,0,6.283); g.fill(); g.fillRect(-3,-1,11,2);
      break; }
    case 'tank': case 'aa': case 'arty': case 'emp': {
      g.rotate(a);
      var L=u.type==='tank'?13:12, W=u.type==='tank'?10:9;
      g.fillStyle='#1f2124'; g.fillRect(-L,-W-2,L*2,5); g.fillRect(-L,W-3,L*2,5);
      g.fillStyle='#3a3d40'; var tr=(t*u.s*0.4)%4; for (var q=-L;q<L;q+=4){ g.fillRect(q+tr,-W-2,1.5,5); g.fillRect(q+tr,W-3,1.5,5); }
      var hull = snow?'#c4c9ce': (u.type==='tank'?'#5e6b45':u.type==='emp'?'#4a5a6a':'#6a6f55');
      g.fillStyle=hull; g.fillRect(-L+1,-W+2,L*2-2,W*2-4); g.fillStyle='rgba(255,255,255,0.12)'; g.fillRect(-L+1,-W+2,L*2-2,3);
      g.fillStyle=tc; g.fillRect(-L+1,-W+2,4,W*2-4);
      g.rotate(u.tang-a);
      if (u.type==='tank'){ g.fillStyle='#4b5637'; g.beginPath(); g.arc(-1,0,6.5,0,6.283); g.fill(); g.fillStyle='#2e3326'; g.fillRect(4,-1.6,16,3.2); g.fillStyle=tc; g.fillRect(-4,-2,3,4); }
      if (u.type==='aa'){ g.fillStyle='#555'; g.fillRect(-5,-6,10,12); g.fillStyle='#222'; g.fillRect(4,-5,12,2); g.fillRect(4,3,12,2); g.strokeStyle='#ccc'; g.beginPath(); g.arc(-3,0,4,(t*3)%6.28,(t*3)%6.28+2); g.stroke(); }
      if (u.type==='arty'){ g.fillStyle='#4d5240'; g.fillRect(-6,-5,10,10); g.fillStyle='#2b2e24'; g.fillRect(2,-2,24,4); }
      if (u.type==='emp'){ var p=0.5+0.5*Math.sin(t*6); g.fillStyle='#334'; g.beginPath(); g.arc(0,0,6,0,6.283); g.fill(); g.strokeStyle='rgba(110,210,255,'+(0.5+p*0.5)+')'; g.lineWidth=2; g.beginPath(); g.arc(0,0,4+p*3,0,6.283); g.stroke(); }
      break; }
    case 'yz': {
      g.rotate(a);
      // 4 bacak / palet modülü
      for (var k=0;k<4;k++){ var lx=(k<2?-1:1)*16, ly=(k%2?-1:1)*18, st=Math.sin(t*4+k*1.6)*2*(u.s>2?1:0);
        g.fillStyle='#1d2024'; g.fillRect(lx-9+st,ly-5,18,10); g.fillStyle='#3a4046'; g.fillRect(lx-7+st,ly-3,14,6); }
      g.fillStyle='rgba(0,0,0,0.35)'; g.beginPath(); for (var h=0;h<6;h++){ var ha=h/6*6.283; g.lineTo(Math.cos(ha)*24+2,Math.sin(ha)*24+3); } g.fill();
      g.fillStyle=snow?'#b8bec4':'#454c55'; g.beginPath(); for (var h2=0;h2<6;h2++){ var hb=h2/6*6.283; g.lineTo(Math.cos(hb)*23,Math.sin(hb)*23); } g.closePath(); g.fill();
      g.strokeStyle=tc; g.lineWidth=2.5; g.stroke();
      g.fillStyle='#2b3036'; g.beginPath(); for (var h3=0;h3<6;h3++){ var hc=h3/6*6.283+0.52; g.lineTo(Math.cos(hc)*15,Math.sin(hc)*15); } g.closePath(); g.fill();
      var pulse=0.6+0.4*Math.sin(t*3);
      var cg=g.createRadialGradient(0,0,1,0,0,13); cg.addColorStop(0,'#fff'); cg.addColorStop(0.35,u.team===ME?'rgba(90,220,255,'+pulse+')':'rgba(255,80,80,'+pulse+')'); cg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=cg; g.beginPath(); g.arc(0,0,13,0,6.283); g.fill();
      g.rotate(u.tang-a); g.fillStyle='#5b636c'; g.fillRect(6,-12,22,5); g.fillRect(6,7,22,5); g.fillStyle='#9ef'; g.fillRect(26,-11,3,3); g.fillRect(26,8,3,3);
      break; }
    case 'heli': {
      g.rotate(a);
      g.fillStyle=snow?'#bfc6cc':'#4c5a40'; g.beginPath(); g.ellipse(2,0,11,5,0,0,6.283); g.fill(); g.fillRect(-18,-1.5,14,3); g.fillRect(-19,-5,3,10);
      g.fillStyle='#9cd'; g.beginPath(); g.ellipse(8,0,4,3,0,0,6.283); g.fill();
      g.fillStyle=tc; g.fillRect(-4,-5,4,10); g.fillStyle='#333'; g.fillRect(0,-8,6,2); g.fillRect(0,6,6,2);
      g.rotate(t*30); g.strokeStyle='rgba(30,30,30,0.7)'; g.lineWidth=2; g.beginPath(); g.moveTo(-17,0); g.lineTo(17,0); g.moveTo(0,-17); g.lineTo(0,17); g.stroke();
      g.fillStyle='rgba(60,60,60,0.15)'; g.beginPath(); g.arc(0,0,17,0,6.283); g.fill();
      break; }
    case 'drone': {
      g.rotate(a);
      for (var dd=0;dd<3;dd++){ g.save(); g.translate((dd-1)*7,(dd%2)*6-3);
        g.strokeStyle='#333'; g.lineWidth=1.4; g.beginPath(); g.moveTo(-4,-4); g.lineTo(4,4); g.moveTo(-4,4); g.lineTo(4,-4); g.stroke();
        g.fillStyle=tc; g.fillRect(-2,-2,4,4); g.fillStyle='rgba(200,200,200,0.4)'; [[-4,-4],[4,4],[-4,4],[4,-4]].forEach(function(p){ g.beginPath(); g.arc(p[0],p[1],2.2,0,6.283); g.fill(); });
        g.restore(); }
      break; }
  }
  g.restore();
  if (u.sick>0 && Math.random()<0.1) FX.parts.push({x:x,y:y-6,vx:0,vy:-10,l:0.8,m:0.8,s:1.6,c:'spark',col:'#c6f',g:0});
}

/* Simge üretici (yan menü için) */
var ICONS={};
function makeIcon(type){
  if (ICONS[type]) return ICONS[type];
  var cv=document.createElement('canvas'); cv.width=cv.height=96; var g=cv.getContext('2d');
  g.fillStyle='#1b2229'; g.fillRect(0,0,96,96);
  var grd=g.createLinearGradient(0,0,0,96); grd.addColorStop(0,'rgba(80,120,90,0.35)'); grd.addColorStop(1,'rgba(0,0,0,0.2)'); g.fillStyle=grd; g.fillRect(0,0,96,96);
  var oldG=G; if(!G) return cv;
  if (BLD[type]){ var d=BLD[type], s=Math.min(70/(d.w*T), 70/((d.h)*T+d.H)); g.save(); g.translate(48-d.w*T*s/2, 52-d.h*T*s/2+d.H*s*0.5); g.scale(s,s);
    drawBuilding(g,{type:type,team:ME,tx:0,ty:0,bp:1,tang:-0.6,anim:0,hp:1,mhp:1},true); g.restore(); }
  else if (UNT[type]){ var u={type:type,team:ME,x:48,y:54,ang:-0.5,tang:-0.5,s:0,z:UNT[type].air?6:0,id:1,cargo:HCAP*0.6}; var sc=type==='yz'?1.5:UNT[type].armor==='pi'?4:UNT[type].r>12?2.4:2.8; g.save(); g.translate(48,52); g.scale(sc,sc); g.translate(-48,-54); drawUnit(g,u); g.restore(); }
  else if (UPG[type]||RECIPES[type]) { g.font='44px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText({zirh:'🛡',silah:'💥',hasat:'⛏',gizli:'🕶',radar:'🛰',yzcore:'🧠',barikat:'🪵',duvar:'🧱',medkit:'⛑',mayin:'💣',isik:'💡',cpu:'💾',zenitzirh:'🟣'}[type]||'⚙',48,50); }
  ICONS[type]=cv; return cv;
}
