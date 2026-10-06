/* ORDU SAVAŞI: KOMUTA — oyun verileri (yapılar, birlikler, hasar tablosu) */
var T = 32;            // karo boyutu (piksel)
var N = 160;           // harita boyutu (karo) — yeni oyunda seçilir: 128 / 160 / 224 / 288
var TEAM_COLORS = ['#3d8bff', '#e8463b', '#9a9a9a', '#8fd14f'];
var TEAM_DARK   = ['#1d4f9e', '#8e211b', '#555555', '#3f6b1d'];
var TEAM_NAMES  = ['Mavi Kuvvetler', 'Kızıl Cephe', 'Tarafsız', 'Mutantlar'];

/* Zırh türleri: pi=piyade, hafif=hafif araç, agir=ağır araç, hava=hava, bina=yapı, yz=yapay zeka çekirdeği */
var DMG = {
  mermi: {pi:1.0, hafif:0.55, agir:0.18, hava:0.35, bina:0.12, yz:0.08},
  top:   {pi:0.35, hafif:1.0, agir:1.0, hava:0, bina:0.85, yz:0.5},
  roket: {pi:0.3, hafif:1.0, agir:1.25, hava:1.4, bina:0.55, yz:0.65},
  flak:  {pi:0.25, hafif:0.3, agir:0.1, hava:2.2, bina:0.05, yz:0.1},
  emp:   {mass:12000, acc:110, turn:2.4, pi:0.05, hafif:0.7, agir:0.7, hava:0.9, bina:0.35, yz:2.6},
  lazer: {pi:1.1, hafif:0.9, agir:0.75, hava:0.7, bina:0.8, yz:0.45},
  topcu: {pi:1.1, hafif:0.7, agir:0.55, hava:0, bina:1.5, yz:0.4},
  asit:  {pi:1.1, hafif:0.8, agir:0.5, hava:0, bina:0.6, yz:0.4},
  pence: {pi:1.0, hafif:0.6, agir:0.35, hava:0, bina:0.7, yz:0.3},
  iyon:  {pi:1, hafif:1, agir:1, hava:1, bina:1, yz:0.6}
};

var CATS = [
  {id:'bina',   ad:'Yapılar', ikon:'🏗'},
  {id:'savunma',ad:'Savunma', ikon:'🛡'},
  {id:'piyade', ad:'Piyade',  ikon:'🪖'},
  {id:'arac',   ad:'Araçlar', ikon:'🚜'},
  {id:'hava',   ad:'Hava',    ikon:'✈'},
  {id:'destek', ad:'Gelişim', ikon:'🔬'}
];

/* Yapılar */
var BLD = {
  yard:    {ad:'Komuta Merkezi', w:4,h:4, hp:5000, cost:0, pow:20, time:0, req:[], cat:null, store:4000, H:26, sight:10, makes:['bina','savunma'],
            bilgi:'Üssün kalbi. Yapıları burası inşa eder. Kaybedersen oyun biter!'},
  power:   {ad:'Enerji Santrali', w:3,h:3, hp:1200, cost:300, pow:100, time:7, req:[], cat:'bina', H:18,
            bilgi:'Üsse elektrik verir. Elektrik yetmezse üretim yavaşlar, kuleler zayıflar.'},
  refinery:{ad:'Rafineri', w:4,h:3, hp:2200, cost:1500, pow:-40, time:14, req:['power'], cat:'bina', store:4000, H:20, freeUnit:'harvester',
            bilgi:'Toplayıcıların getirdiği kristali paraya çevirir. Yanında bedava toplayıcı gelir.'},
  silo:    {ad:'Silo', w:2,h:2, hp:900, cost:300, pow:-10, time:5, req:['refinery'], cat:'bina', store:4000, H:16,
            bilgi:'Fazla kristali saklar. Depo dolunca toplayıcılar bekler.'},
  barracks:{ad:'Kışla', w:3,h:3, hp:1500, cost:500, pow:-20, time:9, req:['power'], cat:'bina', H:16, makes:['piyade'],
            bilgi:'Asker, roketçi ve ajan yetiştirir.'},
  factory: {ad:'Savaş Fabrikası', w:4,h:4, hp:3000, cost:2000, pow:-60, time:18, req:['refinery','barracks'], cat:'bina', H:24, makes:['arac'],
            bilgi:'Tank, cip, toplayıcı ve özel araçlar üretir.'},
  airfield:{ad:'Havaalanı', w:4,h:3, hp:1800, cost:1500, pow:-50, time:16, req:['factory'], cat:'bina', H:12, makes:['hava'],
            bilgi:'Helikopter ve drone üretir.'},
  armory:  {ad:'Cephanelik', w:3,h:3, hp:1400, cost:1000, pow:-30, time:12, req:['barracks'], cat:'bina', H:18, makes:['destek'],
            bilgi:'Zırh ve silah güçlendirmeleri araştırır.'},
  lab:     {ad:'Laboratuvar', w:3,h:3, hp:1600, cost:2500, pow:-80, time:22, req:['factory','armory'], cat:'bina', H:20, makes:['destek'],
            bilgi:'İleri teknoloji: topçu, EMP, drone ve Ana Yapay Zeka.'},
  uplink:  {ad:'İyon Topu Merkezi', w:3,h:3, hp:2000, cost:4000, pow:-150, time:35, req:['lab'], cat:'bina', H:22, sw:240,
            bilgi:'Süper silah. Dolunca haritada istediğin yere uzaydan iyon ışını indirir.'},
  tower_mg:{ad:'Makineli Kule', w:1,h:1, hp:900, cost:400, pow:-10, time:5, req:['barracks'], cat:'savunma', H:14, sight:9, detect:6,
            wpn:{dmg:14, rof:0.35, range:6.5, type:'mermi', air:true, ground:true, fx:'tracer'},
            bilgi:'Askerlere karşı güçlü. Gizli ajanları görür.'},
  tower_cannon:{ad:'Top Kulesi', w:2,h:2, hp:1600, cost:900, pow:-25, time:10, req:['factory'], cat:'savunma', H:16, sight:10, detect:6,
            wpn:{dmg:85, rof:1.5, range:7.5, type:'top', air:false, ground:true, fx:'shell'},
            bilgi:'Tanklara karşı güçlü. Uçaklara ateş edemez.'},
  tower_aa:{ad:'Uçaksavar Kulesi', w:2,h:2, hp:1200, cost:700, pow:-20, time:8, req:['power'], cat:'savunma', H:14, sight:11, detect:6,
            wpn:{dmg:40, rof:0.45, range:9.5, type:'flak', air:true, ground:false, fx:'flak'},
            bilgi:'Helikopter ve droneları düşürür. Yer birliklerine ateş edemez.'},
  wall:    {ad:'Beton Duvar', w:1,h:1, hp:700, cost:50, pow:0, time:1, req:[], cat:'savunma', H:12, wall:true,
            bilgi:'Ucuz engel. Gece gelen mutant sürülerini durdurur. Art arda dizebilirsin.'},
  barricade:{ad:'Ahşap Barikat', w:1,h:1, hp:350, cost:0, pow:0, time:0, req:[], cat:null, H:8, wall:true, bilgi:'Odundan yapılmış engel.'},
  lamp:    {ad:'Projektör', w:1,h:1, hp:300, cost:0, pow:-5, time:0, req:[], cat:null, H:16, sight:8, light:7, bilgi:'Gece ışığı.'},
  derrick: {ad:'Petrol Kuyusu', w:2,h:2, hp:1000, cost:0, pow:0, time:0, req:[], cat:null, H:12, income:6,
            bilgi:'Tarafsız yapı. Ajanla ele geçirirsen sürekli para verir.'}
};

/* Birlikler. spd = piksel/sn, range/sight = karo */
var UNT = {
  rifle:  {mass:90, acc:400, turn:12, ad:'Asker', armor:'pi', hp:130, spd:40, cost:100, time:4, from:'piyade', req:[], r:5, sight:7,
           wpn:{dmg:13, rof:0.6, range:5, type:'mermi', air:true, ground:true, fx:'tracer'},
           guclu:'Askerler', zayif:'Tank, Cip, Drone'},
  rocket: {mass:95, acc:400, turn:12, ad:'Roketçi', armor:'pi', hp:110, spd:36, cost:300, time:6, from:'piyade', req:[], r:5, sight:7,
           wpn:{dmg:55, rof:2.0, range:6, type:'roket', air:true, ground:true, fx:'rocket'},
           guclu:'Tank, Helikopter', zayif:'Asker, Cip'},
  agent:  {mass:80, acc:450, turn:12, ad:'Ajan', armor:'pi', hp:110, spd:50, cost:800, time:10, from:'piyade', req:['barracks'], r:5, sight:9, stealth:true, capture:true,
           guclu:'Yapı ve araç ele geçirir (gizli)', zayif:'Kuleler ve yakındaki askerler onu görür'},
  worker: {mass:85, acc:400, turn:12, ad:'İşçi', armor:'pi', hp:90, spd:40, cost:150, time:4, from:'piyade', req:[], r:5, sight:7, gather:true,
           guclu:'Odun keser, taş kırar, ganimet toplar', zayif:'Silahsız'},
  scientist:{mass:80, acc:400, turn:12, ad:'Bilim İnsanı', armor:'pi', hp:90, spd:38, cost:600, time:8, from:'piyade', req:['barracks'], r:5, sight:8, science:true,
           guclu:'Meteorları inceler, keşif yapar, hastaları iyileştirir', zayif:'Silahsız'},
  harvester:{mass:32000, acc:40, turn:1.6, ad:'Toplayıcı', armor:'agir', hp:1400, spd:42, cost:1400, time:12, from:'arac', req:['refinery'], r:15, sight:6, harvest:true,
           guclu:'Kristal toplar', zayif:'Silahsız'},
  jeep:   {mass:2600, acc:160, turn:3.4, ad:'Keşif Cipi', armor:'hafif', hp:320, spd:100, cost:500, time:6, from:'arac', req:[], r:10, sight:10,
           wpn:{dmg:15, rof:0.3, range:5.5, type:'mermi', air:true, ground:true, fx:'tracer'},
           guclu:'Askerler, Roketçi', zayif:'Tank, Kule'},
  tank:   {mass:55000, acc:60, turn:1.5, ad:'Muharebe Tankı', armor:'agir', hp:850, spd:56, cost:900, time:10, from:'arac', req:[], r:13, sight:8,
           wpn:{dmg:75, rof:1.6, range:6, type:'top', air:false, ground:true, fx:'shell'},
           guclu:'Araçlar, Yapılar', zayif:'Roketçi, Helikopter'},
  aa:     {mass:14000, acc:110, turn:2.4, ad:'Uçaksavar Aracı', armor:'hafif', hp:450, spd:72, cost:700, time:8, from:'arac', req:[], r:11, sight:10,
           wpn:{dmg:28, rof:0.28, range:8.5, type:'flak', air:true, ground:false, fx:'flak'},
           guclu:'Helikopter, Drone', zayif:'Tüm yer birlikleri'},
  arty:   {mass:18000, acc:70, turn:1.8, ad:'Topçu', armor:'hafif', hp:360, spd:45, cost:1100, time:12, from:'arac', req:['lab'], r:12, sight:8,
           wpn:{dmg:130, rof:4.2, range:13, minr:3, type:'topcu', air:false, ground:true, fx:'arty', splash:1.6},
           guclu:'Yapılar, Kuleler (uzaktan)', zayif:'Yakın dövüş, Cip, Hava'},
  emp:    {ad:'EMP Aracı', armor:'hafif', hp:420, spd:66, cost:1000, time:10, from:'arac', req:['lab'], r:11, sight:8,
           wpn:{dmg:30, rof:3.0, range:6.5, type:'emp', air:true, ground:true, fx:'emp', stun:3.5, splash:1.8},
           guclu:'Ana YZ, Araçları kilitler', zayif:'Askerler'},
  yz:     {mass:140000, acc:25, turn:0.8, ad:'Ana YZ Savaş Aracı', armor:'yz', hp:7000, spd:32, cost:6000, time:55, from:'arac', req:['lab','up:yzcore','item:cpu'], r:26, sight:11, limit:1, convert:true,
           wpn:{dmg:95, rof:0.9, range:8, type:'lazer', air:true, ground:true, fx:'laser'},
           guclu:'HER ŞEYİ ele geçirir: araç, asker, yapı', zayif:'EMP Aracı, toplu Roketçi'},
  heli:   {mass:5200, acc:150, turn:2.6, ad:'Saldırı Helikopteri', armor:'hava', hp:520, spd:115, cost:1200, time:12, from:'hava', req:[], r:13, sight:10, air:true,
           wpn:{dmg:48, rof:1.1, range:6, type:'roket', air:false, ground:true, fx:'rocket'},
           guclu:'Tanklar, Araçlar', zayif:'Uçaksavar, Roketçi'},
  drone:  {mass:25, acc:300, turn:5, ad:'Drone Sürüsü', armor:'hava', hp:170, spd:145, cost:450, time:5, from:'hava', req:['lab'], r:8, sight:9, air:true,
           wpn:{dmg:11, rof:0.35, range:4.5, type:'lazer', air:true, ground:true, fx:'laser'},
           guclu:'Askerler, Topçu', zayif:'Uçaksavar (flak)'}
  ,
  /* Gece sürüsü (7 Days to Die esintisi) — oyuncu üretemez */
  mutant: {mass:85, acc:300, turn:8, ad:'Mutant', armor:'pi', hp:170, spd:30, cost:0, time:0, from:null, req:[], r:6, sight:9, horde:true,
           wpn:{dmg:16, rof:0.9, range:0.9, type:'pence', air:false, ground:true, fx:'claw'}, guclu:'Sürü halinde saldırır', zayif:'Makineli Kule, Asker, Gün ışığı'},
  runner: {mass:70, acc:500, turn:10, ad:'Koşucu Mutant', armor:'pi', hp:110, spd:62, cost:0, time:0, from:null, req:[], r:5, sight:10, horde:true,
           wpn:{dmg:11, rof:0.6, range:0.9, type:'pence', air:false, ground:true, fx:'claw'}, guclu:'Çok hızlı', zayif:'Duvarlar, Cip'},
  alien:  {mass:60, acc:500, turn:10, ad:'Uzay Böceği', armor:'hafif', hp:220, spd:58, cost:0, time:0, from:null, req:[], r:7, sight:10, horde:true, alien:true,
           wpn:{dmg:22, rof:0.7, range:1.0, type:'asit', air:false, ground:true, fx:'claw'}, guclu:'Meteordan çıkar, virüs taşır', zayif:'Makineli, Asker'},
  brute:  {mass:400, acc:120, turn:4, ad:'Dev Mutant', armor:'agir', hp:1100, spd:26, cost:0, time:0, from:null, req:[], r:11, sight:9, horde:true,
           wpn:{dmg:70, rof:1.4, range:1.1, type:'pence', air:false, ground:true, fx:'claw'}, guclu:'Duvar ve yapı yıkar', zayif:'Tank, Roketçi'}
};

/* Gün / gece döngüsü */
var DAY_LEN = 240, NIGHT_START = 0.68; /* gün uzunluğu sn; 0.68'den sonra gece */
var BLOOD_MOON = 7; /* her 7. gece Kızıl Ay sürüsü */
var LOOT_TYPES = ['araba','sandik','enkaz'];

/* Meteor bilimi: bilim insanları meteor kraterinde inceleme yapıp puan toplar */
var DISCOVERIES = [
  {k:'asi',    puan:60,  ad:'Uzay Virüsü Aşısı', bilgi:'Askerler virüse bağışık olur, hastalar iyileşir.'},
  {k:'plazma', puan:140, ad:'Plazma Silahları', bilgi:'Lazer silahları %25 daha güçlü.'},
  {k:'meteorzirh', puan:240, ad:'Meteor Zırhı', bilgi:'Araçlar ve yapılar %15 daha dayanıklı.'},
  {k:'dna',    puan:360, ad:'Uzaylı DNA Çözümü', bilgi:'Mutant ve uzay böceklerine %40 fazla hasar.'}
];

/* Gelişimler (Cephanelik / Laboratuvar) */
var UPG = {
  zirh:   {ad:'Zırh Kaplama', cost:1500, time:30, req:['armory'], bilgi:'Tüm birlikler %20 daha az hasar alır.'},
  silah:  {ad:'Güçlü Mermi', cost:1500, time:30, req:['armory'], bilgi:'Tüm silahlar %20 daha fazla vurur.'},
  hasat:  {ad:'Hızlı Toplama', cost:1000, time:20, req:['armory'], bilgi:'Toplayıcılar %35 daha hızlı toplar.'},
  gizli:  {ad:'Ajan Gizliliği', cost:1200, time:25, req:['lab'], bilgi:'Ajanları sadece kuleler görebilir.'},
  radar:  {ad:'Uydu Radarı', cost:2000, time:35, req:['lab'], bilgi:'Tüm haritanın keşfini açar.'},
  yzcore: {ad:'YZ Çekirdeği', cost:3000, time:45, req:['lab'], bilgi:'Ana Yapay Zeka Savaş Aracını açar.'}
};

var BUILD_ORDER_BINA = ['power','refinery','silo','barracks','factory','airfield','armory','lab','uplink'];
var BUILD_ORDER_SAV = ['tower_mg','tower_cannon','tower_aa'];
