/* ORDU SAVAŞI: KOMUTA — toplama ve zanaat (Minecraft mantığı) */
var MATS = {odun:{ad:'Odun',ikon:'🪵'}, tas:{ad:'Taş',ikon:'🪨'}, demir:{ad:'Demir',ikon:'⛓'}, bakir:{ad:'Bakır',ikon:'🟠'}, altin:{ad:'Altın',ikon:'🟡'}, zenit:{ad:'Zenit',ikon:'🟣'}};
/* maden türü -> malzeme */
var ORE_MAT = [null,'demir','bakir','altin',null,'zenit'];
var RECIPES = {
  barikat: {ad:'Ahşap Barikat', mat:{odun:8}, cr:0, yap:'barricade', bilgi:'Ucuz engel. İstediğin kadar diz.'},
  duvar:   {ad:'Beton Duvar', mat:{tas:4}, cr:50, yap:'wall', bilgi:'Sağlam duvar. Mutantları durdurur.'},
  medkit:  {ad:'Sağlık Kiti', mat:{odun:3, bakir:2}, cr:0, item:'medkit', bilgi:'Seçili askerleri tam iyileştirir, virüsü temizler.'},
  mayin:   {ad:'Mayın', mat:{demir:3}, cr:50, item:'mine', bilgi:'Seçili birliğin altına gizli mayın koyar.'},
  isik:    {ad:'Projektör', mat:{demir:2, bakir:2}, cr:100, yap:'lamp', bilgi:'Geceleri etrafı aydınlatır, görüşü artırır.'},
  cpu:     {ad:'Kuantum İşlemci', mat:{altin:3, bakir:4}, cr:500, item:'cpu', bilgi:'Ana Yapay Zeka Savaş Aracı için gerekli beyin.'},
  zenitzirh:{ad:'Zenit Zırh Plakası', mat:{zenit:4, demir:6}, cr:500, up:'zenitzirh', bilgi:'Tankların ve YZ\'nin zırhı %25 artar.'}
};
