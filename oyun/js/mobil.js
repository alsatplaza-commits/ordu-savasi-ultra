/* Telefon kabuğu: ince üst şerit, çekmeceler kapalı başlar.
   Dar ekranda çekmece CSS ile kapalıdır (side-open yok). JS sınıfı şart değil. */
function isNarrow(){
  var q=false;
  try { q=matchMedia('(max-width: 700px), (max-height: 500px) and (max-width: 1100px)').matches; } catch(e){}
  var vv=window.visualViewport;
  if (vv && Math.min(vv.width, vv.height)<=520) q=true;
  var m=Math.min(window.innerWidth||9999, window.innerHeight||9999);
  if (m<=520) q=true;
  return q;
}
function isPhoneLayout(){
  if (!isNarrow()) return false;
  var ua=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'');
  var coarse=false;
  try { coarse=matchMedia('(pointer: coarse)').matches; } catch(e){}
  if (ua || coarse) return true;
  var m=Math.min(window.innerWidth||9999, window.innerHeight||9999);
  return m<=520;
}
function applyPhoneChrome(){
  var mob=isPhoneLayout(), root=document.documentElement, was=root.classList.contains('mob');
  root.classList.toggle('mob', mob);
  if (!mob && !isNarrow()){
    root.classList.remove('side-shut','cmd-shut','side-open','cmd-open');
    syncDrawerButtons();
    return;
  }
  if (!was) root.classList.add('side-shut','cmd-shut');
  syncDrawerButtons();
}
function syncDrawerButtons(){
  var root=document.documentElement;
  var sideOn=root.classList.contains('side-open');
  var cmdOn=root.classList.contains('cmd-open');
  var b=document.getElementById('buildBtn'), c=document.getElementById('cmdBtn');
  if (b) b.classList.toggle('on', sideOn);
  if (c) c.classList.toggle('on', cmdOn);
}
function setSideOpen(on){
  var root=document.documentElement;
  root.classList.toggle('side-open', !!on);
  root.classList.toggle('side-shut', !on);
  syncDrawerButtons();
}
function setCmdOpen(on){
  var root=document.documentElement;
  root.classList.toggle('cmd-open', !!on);
  root.classList.toggle('cmd-shut', !on);
  syncDrawerButtons();
}
function closeDrawers(){
  setSideOpen(false);
  setCmdOpen(false);
}
function bindFlip(el, which){
  if (!el) return;
  var lock=0;
  function go(ev){
    if (ev){ ev.preventDefault(); ev.stopPropagation(); }
    var now=Date.now(); if (now-lock<500) return; lock=now;
    var open=document.documentElement.classList.contains(which==='side'?'side-open':'cmd-open');
    if (which==='side') setSideOpen(!open); else setCmdOpen(!open);
  }
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}
function bindToggle(el, className){
  if (!el) return;
  var lock=0;
  function go(ev){
    if (ev){ ev.preventDefault(); ev.stopPropagation(); }
    var now=Date.now(); if (now-lock<500) return; lock=now;
    document.documentElement.classList.toggle(className);
    syncDrawerButtons();
  }
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}
function bindClear(el, className){
  if (!el) return;
  function go(ev){
    if (ev){ ev.preventDefault(); ev.stopPropagation(); }
    document.documentElement.classList.remove(className);
    if (className==='side-open') document.documentElement.classList.add('side-shut');
    if (className==='cmd-open') document.documentElement.classList.add('cmd-shut');
    syncDrawerButtons();
  }
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}
function bindShut(el, className){
  if (!el) return;
  function go(ev){
    if (ev){ ev.preventDefault(); ev.stopPropagation(); }
    document.documentElement.classList.add(className);
    if (className==='side-shut') document.documentElement.classList.remove('side-open');
    if (className==='cmd-shut') document.documentElement.classList.remove('cmd-open');
    syncDrawerButtons();
  }
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}
applyPhoneChrome();
