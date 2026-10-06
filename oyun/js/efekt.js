/* ORDU SAVAŞI: KOMUTA — görsel efektler: patlama, duman, kıvılcım, ışın */
var FXQ = 1; // kalite çarpanı
function fxFlash(x,y,s,c){ FX.parts.push({x:x,y:y,vx:0,vy:0,l:0.07,m:0.07,s:s,c:'flash',col:c||'#fff',g:0}); }
function fxSpark(x,y,c){ for (var i=0;i<3*FXQ;i++){ var a=Math.random()*6.28, v=40+Math.random()*80; FX.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:0.25,m:0.25,s:1.4,c:'spark',col:c||'#ffd27a',g:0}); } }
function fxSmoke(x,y,n){ for (var i=0;i<n*FXQ;i++) FX.parts.push({x:x+(Math.random()-0.5)*6,y:y+(Math.random()-0.5)*6,vx:(Math.random()-0.5)*14,vy:-8-Math.random()*10,l:1.2,m:1.2,s:3+Math.random()*3,c:'smoke',g:-3}); }
function fxPuff(x,y){ FX.parts.push({x:x,y:y,vx:0,vy:0,l:0.5,m:0.5,s:5,c:'puff',g:0}); }
function fxRing(x,y,c,r){ FX.parts.push({x:x,y:y,vx:0,vy:0,l:0.6,m:0.6,s:r||40,c:'ring',col:c,g:0}); }
function fxBlood(x,y,green,n){ for (var i=0;i<(n||6);i++){ var a=Math.random()*6.28, v=20+Math.random()*50; FX.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:0.4,m:0.4,s:1.6,c:'spark',col:green?'#8f3':'#b11',g:0}); } if(!n) FX.decals.push({x:x,y:y,r:6,k:green?'goo':'blood',a:Math.random()*6}); }
function fxExplosion(x,y,size,delay){
  size=size||1; delay=delay||0;
  FX.parts.push({x:x,y:y,vx:0,vy:0,l:0.25+delay,m:0.25,s:24*size,c:'flash',col:'#fff2c0',g:0,d:delay});
  for (var i=0;i<Math.round(10*size*FXQ);i++){ var a=Math.random()*6.28, v=(30+Math.random()*90)*size;
    FX.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7,l:0.5+Math.random()*0.4+delay,m:0.8,s:(6+Math.random()*8)*size,c:'fire',g:-10,d:delay}); }
  for (var j=0;j<Math.round(8*size*FXQ);j++){ var b=Math.random()*6.28, w=(10+Math.random()*40)*size;
    FX.parts.push({x:x,y:y,vx:Math.cos(b)*w,vy:Math.sin(b)*w*0.6-10,l:1.6+Math.random()*1.4+delay,m:2.5,s:(8+Math.random()*10)*size,c:'smoke',g:-6,d:delay}); }
  for (var k=0;k<Math.round(6*size*FXQ);k++){ var c=Math.random()*6.28, z=(80+Math.random()*160)*size;
    FX.parts.push({x:x,y:y,vx:Math.cos(c)*z,vy:Math.sin(c)*z,l:0.5+delay,m:0.5,s:1.6,c:'spark',col:'#ffcf6a',g:0,d:delay}); }
  FX.parts.push({x:x,y:y,vx:0,vy:0,l:0.45+delay,m:0.45,s:34*size,c:'ring',col:'rgba(255,220,160,0.6)',g:0,d:delay});
  FX.shake=Math.min(14, FX.shake+size*2.5);
}
function updateFX(dt){
  var P=FX.parts;
  if (P.length>3000*FXQ) P.splice(0,P.length-3000*FXQ);
  for (var i=P.length-1;i>=0;i--){ var p=P[i];
    if (p.d>0){ p.d-=dt; continue; }
    p.l-=dt; if (p.l<=0){ P[i]=P[P.length-1]; P.pop(); continue; }
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.96; p.vy=p.vy*0.96+p.g*dt;
  }
  for (var j=FX.beams.length-1;j>=0;j--){ FX.beams[j].l-=dt; if (FX.beams[j].l<=0) FX.beams.splice(j,1); }
  for (var k=FX.texts.length-1;k>=0;k--){ var t=FX.texts[k]; t.l-=dt; t.y-=dt*18; if (t.l<=0) FX.texts.splice(k,1); }
  FX.shake*=Math.pow(0.02,dt);
}
