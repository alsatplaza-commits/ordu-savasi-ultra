/* ORDU SAVAŞI: KOMUTA — doğa kataloğu: bitki, hayvan, böcek, taş ve madenler.
   Harita parçalar (chunk) halinde, kameranın gördüğü yerde üretilir ve çizilir. */
var FLORA = {
  /* ağaçlar: zemin ve mevsime göre renk */
  mese:    {ad:'Meşe', tur:'agac', zemin:[0], r:13, renk:['#4f8a2f','#3f7a26','#c9822b','#d9e4e8'], govde:'#5b3a1e'},
  cam:     {ad:'Çam', tur:'agac', zemin:[0,1], r:11, renk:['#2f6b3a','#2a6034','#2f6436','#e9f1f3'], govde:'#4a2f18', sivri:true},
  kavak:   {ad:'Kavak', tur:'agac', zemin:[0], r:8, renk:['#6aa13a','#5d9433','#e0b23a','#dfe8ea'], govde:'#6b4a2a'},
  palmiye: {ad:'Palmiye', tur:'agac', zemin:[8], r:12, renk:['#5c9c3a','#58963a','#7a9a3a','#9fb09a'], govde:'#8a6a3a', palm:true},
  calilik: {ad:'Çalılık', tur:'cali', zemin:[0,1,8], r:6, renk:['#5e8f3a','#557f33','#a0702e','#c8d2d4'], govde:null},
  kaktus:  {ad:'Kaktüs', tur:'cali', zemin:[8], r:4, renk:['#4c8a3c','#4c8a3c','#4c8a3c','#8aa58a'], govde:null, kaktus:true},
  /* çiçekler: kışın görünmez */
  gelincik:{ad:'Gelincik', tur:'cicek', zemin:[0], renk:'#e0312b', mevsim:[0,1]},
  papatya: {ad:'Papatya', tur:'cicek', zemin:[0], renk:'#f4f4ee', mevsim:[0,1,2]},
  lale:    {ad:'Lale', tur:'cicek', zemin:[0], renk:'#d8327a', mevsim:[0]},
  lavanta: {ad:'Lavanta', tur:'cicek', zemin:[0,1], renk:'#9a72d8', mevsim:[1]},
  aycicegi:{ad:'Ayçiçeği', tur:'cicek', zemin:[1], renk:'#f2c21a', mevsim:[1,2]}
};
var STONES = {
  tas:    {ad:'Taş', renk:'#8d8a83', r:4},
  granit: {ad:'Granit Kaya', renk:'#9a8f86', r:7},
  bazalt: {ad:'Bazalt', renk:'#4f4d4b', r:6}
};
/* Maden yatakları: toplayıcı ile toplanır, değerleri farklı */
var ORES = [
  {ad:'Yeşil Kristal', deger:5,  renk:'#3dff6a', isik:'rgba(80,255,120,', bilgi:'Ana kaynak, yavaşça yeniden büyür.'},
  {ad:'Demir Cevheri', deger:4,  renk:'#b06a4a', isik:'rgba(200,120,90,', bilgi:'Bol ama ucuz. Yeniden büyümez.'},
  {ad:'Bakır Cevheri', deger:6,  renk:'#d9894a', isik:'rgba(255,150,80,', bilgi:'Orta değerli.'},
  {ad:'Altın Damarı',  deger:10, renk:'#f5cf3a', isik:'rgba(255,220,80,', bilgi:'Çok değerli ama az.'},
  {ad:'Mavi Kristal',  deger:9,  renk:'#4fc3ff', isik:'rgba(90,190,255,', bilgi:'Nadir, yavaş büyür.'},
  {ad:'Meteor Elementi (Zenit)', deger:16, renk:'#d05cff', isik:'rgba(210,100,255,', bilgi:'Uzaydan geldi. Çok değerli, ama yanında virüs olabilir.'}
];
/* Hayvanlar ve böcekler (görsel ekosistem; birliklerden kaçarlar) */
var FAUNA = {
  geyik:     {ad:'Geyik', zemin:[0,1], spd:70, kac:110, boy:7, renk:'#8b5a2b', gece:false, mevsim:[0,1,2,3], sur:[2,4]},
  tavsan:    {ad:'Tavşan', zemin:[0,1,8], spd:85, kac:70, boy:3, renk:'#c8b08a', gece:false, mevsim:[0,1,2,3], sur:[1,3], kis:'#f2f2f2'},
  kurt:      {ad:'Kurt', zemin:[0,1], spd:80, kac:60, boy:6, renk:'#6d6a66', gece:true, mevsim:[2,3], sur:[2,4]},
  inek:      {ad:'İnek', zemin:[0], spd:25, kac:50, boy:8, renk:'#efe9e0', gece:false, mevsim:[0,1,2], sur:[2,5], benek:true},
  kus:       {ad:'Kuş Sürüsü', ucan:true, spd:90, kac:120, boy:3, renk:'#2b2b2b', gece:false, mevsim:[0,1,2], sur:[5,9]},
  kelebek:   {ad:'Kelebek', ucan:true, bocek:true, spd:22, kac:0, boy:2, renk:'#ffb347', gece:false, mevsim:[0,1], sur:[2,4]},
  ari:       {ad:'Arı', ucan:true, bocek:true, spd:30, kac:0, boy:1.4, renk:'#f5d000', gece:false, mevsim:[0,1], sur:[3,6]},
  atesbocegi:{ad:'Ateş Böceği', ucan:true, bocek:true, spd:12, kac:0, boy:1.6, renk:'#d8ff6a', gece:true, sadeceGece:true, mevsim:[1], sur:[6,12], isik:true},
  balik:     {ad:'Balık', su:true, spd:30, kac:40, boy:3, renk:'#9cc9e8', gece:false, mevsim:[0,1,2], sur:[2,4]}
};
var CHUNK = 16; /* karo */
