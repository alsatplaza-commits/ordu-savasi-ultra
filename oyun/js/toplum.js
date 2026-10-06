/* ORDU SAVAŞI: KOMUTA — toplum: devlet, halk, klanlar, aileler, kişiler, kasabalar */
var CLANS = [
  {k:'kartal', ad:'Kartal Klanı', ikon:'🦅', renk:'#e8c25a', bilgi:'Eski pilot aileleri. Hava birliklerinde iyi.'},
  {k:'bozkurt',ad:'Bozkurt Klanı', ikon:'🐺', renk:'#b8b8c8', bilgi:'Dağ köylerinden gelen dayanıklı askerler.'},
  {k:'demirci',ad:'Demirci Klanı', ikon:'⚒', renk:'#d0864a', bilgi:'Fabrika işçileri. Araç ve tamirde usta.'},
  {k:'yildiz', ad:'Yıldız Klanı', ikon:'✶', renk:'#8ec8ff', bilgi:'Şehirli, okumuş aileler. Bilim ve ajanlık.'}
];
var NAMES_M = ['Ahmet','Mehmet','Ali','Mustafa','Hasan','Hüseyin','Emre','Burak','Can','Kerem','Yusuf','Ömer','Murat','Serkan','Okan','Tolga','Kaan','Eren','Arda','Berk','Deniz','Efe','Selim','Oğuz','Cem','Volkan','Barış','Tuna','Mert','Umut'];
var NAMES_F = ['Ayşe','Fatma','Zeynep','Elif','Merve','Selin','Deniz','Ece','Derya','Gizem','Aslı','Esra','Büşra','Nur','İrem','Defne','Ceren','Yasemin','Sevgi','Melis'];
var FAMILIES = ['Yılmaz','Kaya','Demir','Şahin','Çelik','Yıldız','Aydın','Öztürk','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özdemir','Polat','Erdem','Güneş','Tekin','Aksoy','Uçar','Bulut'];
var RANKS = ['Er','Onbaşı','Çavuş','Üsteğmen','Yüzbaşı'];
var LAWS = {
  vergi:   {ad:'Vergi', secenek:[{ad:'Düşük', gelir:0.9, moral:+0.6},{ad:'Normal', gelir:1, moral:0},{ad:'Yüksek', gelir:1.2, moral:-0.9}]},
  askerlik:{ad:'Askerlik', secenek:[{ad:'Gönüllü', hiz:1, moral:+0.3},{ad:'Zorunlu', hiz:1.3, moral:-0.7}]},
  gece:    {ad:'Gece Yasağı', secenek:[{ad:'Yok', savunma:1, moral:0},{ad:'Var', savunma:1.2, moral:-0.4}]},
  saglik:  {ad:'Sağlık', secenek:[{ad:'Temel', iyilesme:0, maliyet:0, moral:0},{ad:'Ücretsiz Hastane', iyilesme:1, maliyet:3, moral:+0.5}]}
};
var TOWN_NAMES = ['Merkez Kent','Kuzey Kasabası','Güney Kasabası','Batı Köyü','Doğu Köyü'];

function newSociety(R){
  return {moral:70, laws:{vergi:1, askerlik:0, gece:0, saglik:0},
    clans: CLANS.map(function(){ return {sadakat:60, uye:0, kayip:0}; }), olen:0, kahraman:[]};
}
function makePerson(R, unitType){
  var female = R()<0.35;
  var clan = Math.floor(R()*CLANS.length);
  if (unitType==='scientist'||unitType==='agent') { if (R()<0.5) clan=3; }
  if (unitType==='heli'||unitType==='drone') { if (R()<0.5) clan=0; }
  if (unitType==='tank'||unitType==='harvester'||unitType==='jeep') { if (R()<0.4) clan=2; }
  var ad = female ? NAMES_F[Math.floor(R()*NAMES_F.length)] : NAMES_M[Math.floor(R()*NAMES_M.length)];
  return {ad:ad, soy:FAMILIES[Math.floor(R()*FAMILIES.length)], klan:clan, rutbe:0, kadin:female};
}
function personTitle(p){ return RANKS[p.rutbe]+' '+p.ad+' '+p.soy; }
