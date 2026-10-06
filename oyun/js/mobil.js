/* Telefon kabuğu: ince üst şerit, çekmeceler kapalı başlar */
function isPhoneLayout(){
  var ua=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'');
  var coarse=false, small=false;
  try { coarse=matchMedia('(pointer: coarse)').matches; } catch(e){}
  try { small=matchMedia('(max-width: 900px), (max-height: 540px)').matches; } catch(e){}
  if (!small){ var m=Math.min(window.innerWidth||0, window.innerHeight||0); if (m && m<=540) small=true; }
  return (ua || coarse) && small;
}
function applyPhoneChrome(){
  var mob=isPhoneLayout(), root=document.documentElement, was=root.classList.contains('mob');
  root.classList.toggle('mob', mob);
  if (!mob){ root.classList.remove('side-shut','cmd-shut'); syncDrawerButtons(); return; }
  if (!was) root.classList.add('side-shut','cmd-shut');
  syncDrawerButtons();
}
function syncDrawerButtons(){
  var root=document.documentElement, mob=root.classList.contains('mob');
  var b=document.getElementById('buildBtn'), c=document.getElementById('cmdBtn');
  if (b) b.classList.toggle('on', mob && !root.classList.contains('side-shut'));
  if (c) c.classList.toggle('on', mob && !root.classList.contains('cmd-shut'));
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
function bindShut(el, className){
  if (!el) return;
  function go(ev){
    if (ev){ ev.preventDefault(); ev.stopPropagation(); }
    document.documentElement.classList.add(className);
    syncDrawerButtons();
  }
  el.addEventListener('pointerup', go);
  el.addEventListener('click', go);
}
applyPhoneChrome();
