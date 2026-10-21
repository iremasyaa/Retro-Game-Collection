import * as satranc from './satranc/game.js';
import * as dama from './dama/game.js';
import * as tavla from './tavla/game.js';
import * as amiral from './amiral.js';
import * as mayin from './mayin.js';
import * as hafiza from './hafiza.js';
import * as asmaca from './asmaca.js';
import * as tugla from './tugla.js';
import * as yilan from './yilan.js';
import * as robo from './robo.js';

const VS = [
  { id: '1p', label: '1 OYUNCU', desc: 'Bilgisayara karşı' },
  { id: '2p', label: '2 OYUNCU', desc: 'Aynı bilgisayarda' },
];
const SOLO = [{ id: '1p', label: 'TEK OYUNCU', desc: 'Rekorunu geliştir' }];
const AI_DIFF = {
  id: 'zorluk', label: 'BİLGİSAYAR', when: (o) => o.mod === '1p' || o.mod === 'ai', def: 'orta',
  choices: [['kolay', 'KOLAY'], ['orta', 'ORTA'], ['zor', 'ZOR']],
};

export const GAMES = [
  {
    id: 'satranc', name: 'SATRANÇ', short: 'Satranç', tag: '3D', players: '1-2 OYUNCU', module: satranc,
    blurb: 'Klasik satranç, döndürülebilir 3D tahtada. Sen beyazlarla başlarsın.',
    modes: VS, options: [AI_DIFF],
    help: [
      ['AMAÇ', ['Rakip şahı, kaçamayacağı şekilde tehdit et: şah-mat.']],
      ['KONTROLLER', ['Taşına tıkla, sonra parlayan kareye tıkla.', 'Boş alanı sürükleyerek tahtayı döndür, tekerlek ya da iki parmakla yakınlaş.', '<kbd>GERİ AL</kbd> son hamleni geri alır.']],
      ['KURALLAR', ['Rok, geçerken alma ve piyon terfisi oynanır.', 'Pat, 50 hamle kuralı, üç kez tekrar ve yetersiz taş beraberliktir.']],
    ],
  },
  {
    id: 'dama', name: 'DAMA', short: 'Dama', tag: '3D', players: '1-2 OYUNCU', module: dama,
    blurb: 'Klasik dama: taşlar çapraz gider, yemek zorunludur. Kırmızılar başlar.',
    modes: VS, options: [AI_DIFF],
    help: [
      ['AMAÇ', ['Rakibin bütün taşlarını ye ya da hamle yapamaz hale getir.']],
      ['KONTROLLER', ['Taşına tıkla, sonra parlayan kareye tıkla. Zincirleme yemede her atlayışı tek tek seç.', 'Boş alanı sürükleyerek tahtayı döndür.']],
      ['KURALLAR', ['Taşlar bir kare çapraz ileri gider ve yalnızca ileri yer.', 'Yeme zorunludur; zincir yarıda bırakılamaz.', 'Son sıraya ulaşan taş dama olur: her yöne bir kare gider ve geri de yer.']],
    ],
  },
  {
    id: 'tavla', name: 'TAVLA', short: 'Tavla', tag: '3D', players: '1-2 OYUNCU', module: tavla,
    blurb: 'Zarları at, pullarını eve topla. Mars iki sayı.',
    modes: VS,
    options: [AI_DIFF, { id: 'mac', label: 'MAÇ', def: '3', choices: [['1', '1 EL'], ['3', '3 SAYI'], ['5', '5 SAYI']] }],
    help: [
      ['AMAÇ', ['15 pulunun hepsini kendi evine getir ve topla. İlk toplayan eli alır.', 'Rakip hiç pul toplayamadan biterse mars olur: 2 sayı.']],
      ['KONTROLLER', ['<kbd>ZAR AT</kbd> ya da boşluk tuşu.', 'Pula tıkla, sonra parlayan haneye tıkla. Toplamak için sağdaki tepsiye tıkla.', '<kbd>GERİ AL</kbd> bu eldeki hamlelerini geri alır.']],
      ['KURALLAR', ['İki pul olan haneye konulamaz; tek pulu kırarsın.', 'Kırılan pul önce girmelidir.', 'Zarların ikisi de oynanabiliyorsa ikisini de oynamak zorunludur; çift gelirse dört kez oynanır.']],
    ],
  },
  {
    id: 'amiral', name: 'AMİRAL BATTI', short: 'Amiral Battı', tag: '2D', players: '1-2 OYUNCU', module: amiral,
    blurb: 'Filonu yerleştir, radarda düşman gemilerini avla.',
    modes: VS, options: [AI_DIFF],
    help: [
      ['AMAÇ', ['Rakibin 5 gemisinin hepsini batır.']],
      ['YERLEŞTİRME', ['Bir gemi seç, haritada yerine tıkla. <kbd>R</kbd> ya da sağ tık gemiyi döndürür.', 'Yerleşmiş gemiye tıklayınca geri alırsın. <kbd>RASTGELE</kbd> hepsini dağıtır.']],
      ['SAVAŞ', ['Radarda bir kareye tıklayıp ateş et. Sırayla atılır.', 'İki kişide sıra değişirken ekran kapanır; tahtayı diğer oyuncuya ver.']],
    ],
  },
  {
    id: 'mayin', name: 'MAYIN TARLASI', short: 'Mayın Tarlası', tag: '2D', players: 'TEK OYUNCU', module: mayin,
    blurb: 'Sayılara bak, mayınları bul, tarlayı temizle.',
    modes: SOLO,
    options: [{ id: 'zorluk', label: 'TARLA', def: 'kolay', choices: [['kolay', 'KOLAY', '9×9 · 10'], ['orta', 'ORTA', '16×16 · 40'], ['zor', 'ZOR', '30×16 · 88']] }],
    help: [
      ['AMAÇ', ['Mayın olmayan bütün kareleri aç.']],
      ['KONTROLLER', ['Sol tık kareyi açar, sağ tık bayrak koyar.', 'Dokunmatikte basılı tut ya da <kbd>BAYRAK</kbd> modunu aç.', 'Etrafındaki bayraklar sayıya eşit olan bir sayıya tıklarsan komşuları açılır.']],
      ['İPUCU', ['Sayı, o karenin etrafındaki 8 karede kaç mayın olduğunu gösterir. İlk tıklama her zaman güvenlidir.']],
    ],
  },
  {
    id: 'hafiza', name: 'KART EŞLEŞTİRME', short: 'Kart Eşleştirme', tag: '2D', players: '1-2 OYUNCU', module: hafiza,
    blurb: 'Kartları çevir, aynı resimleri bul. Hafızana güven.',
    modes: [
      { id: 'solo', label: 'TEK OYUNCU', desc: 'En az hamlede bitir' },
      { id: 'ai', label: 'BİLGİSAYAR', desc: 'Bilgisayara karşı' },
      { id: '2p', label: '2 OYUNCU', desc: 'Sırayla' },
    ],
    options: [
      { id: 'boyut', label: 'KART SAYISI', def: 'orta', choices: [['kolay', '16 KART'], ['orta', '24 KART'], ['zor', '36 KART']] },
      AI_DIFF,
    ],
    help: [
      ['AMAÇ', ['Bütün çiftleri bul. Rakiple oynarken en çok çifti bulan kazanır.']],
      ['KONTROLLER', ['Bir karta tıkla, sonra ikinci karta tıkla. Aynıysa açık kalır ve tekrar oynarsın.']],
    ],
  },
  {
    id: 'asmaca', name: 'ADAM ASMACA', short: 'Adam Asmaca', tag: '2D', players: '1-2 OYUNCU', module: asmaca,
    blurb: 'Kara tahtada klasik adam asmaca. Harfleri tahmin et, adam asılmadan kelimeyi bul.',
    modes: [
      { id: '1p', label: 'TEK OYUNCU', desc: 'Bilgisayar kelime tutar' },
      { id: '2p', label: '2 OYUNCU', desc: 'Biri yazar, öbürü bulur' },
    ],
    options: [
      {
        id: 'kategori', label: 'KATEGORİ', when: (o) => o.mod === '1p', def: 'karisik',
        choices: [['karisik', 'KARIŞIK'], ['hayvan', 'HAYVANLAR'], ['meyve', 'MEYVE-SEBZE'], ['yiyecek', 'YİYECEK'], ['sehir', 'İLLER'],
          ['ulke', 'ÜLKELER'], ['meslek', 'MESLEKLER'], ['esya', 'EŞYALAR'], ['spor', 'SPOR-OYUN']],
      },
      { id: 'zorluk', label: 'ZORLUK', def: 'orta', choices: [['kolay', 'KOLAY', '10 HAK'], ['orta', 'ORTA', '8 HAK'], ['zor', 'ZOR', '6 HAK']] },
    ],
    help: [
      ['AMAÇ', ['Harfleri tahmin et, adam asılmadan kelimeyi bul. Her yanlış harf tahtaya bir parça çizer.']],
      ['KONTROLLER', ['Harflere tıkla ya da klavyeden yaz. <kbd>İPUCU</kbd> bir harfi açar ama bir hak götürür.']],
      ['MODLAR', ['Tek oyuncu: bilgisayar kelime tutar, bildikçe serin uzar. Zorluk arttıkça hak azalır, kelimeler uzar.', 'İki oyuncu: biri gizlice kelime yazar, öbürü bulur. Bulursa tahminci, bulamazsa yazan puan alır; roller her tur değişir.']],
    ],
  },
  {
    id: 'tugla', name: 'TUĞLA KIRMA', short: 'Tuğla Kırma', tag: '2D', players: 'TEK OYUNCU', module: tugla,
    blurb: 'Raketle topu sektir, bütün tuğlaları kır. 5 bölüm.',
    modes: SOLO,
    options: [{ id: 'zorluk', label: 'HIZ', def: 'orta', choices: [['kolay', 'YAVAŞ'], ['orta', 'NORMAL'], ['zor', 'HIZLI']] }],
    help: [
      ['AMAÇ', ['Topu düşürmeden bütün kırılabilir tuğlaları kır.']],
      ['KONTROLLER', ['Fare ya da <kbd>←</kbd> <kbd>→</kbd> ile raketi oynat. Tıkla ya da <kbd>BOŞLUK</kbd> ile topu fırlat.', '<kbd>P</kbd> duraklatır.']],
      ['GÜÇLER', ['G: geniş raket · Ç: üç top · Y: yavaş top · +: ekstra can.', 'Gri metal tuğlalar kırılmaz; çift çizgili tuğlalar iki vuruşta kırılır.']],
    ],
  },
  {
    id: 'yilan', name: 'YILAN', short: 'Yılan', tag: '2D', players: '1-2 OYUNCU', module: yilan,
    blurb: 'Elmaları ye, uza, kendine ve duvara çarpma.',
    modes: [
      { id: '1p', label: 'TEK OYUNCU', desc: 'Rekor için oyna' },
      { id: '2p', label: '2 OYUNCU', desc: 'Aynı klavyede düello' },
    ],
    options: [{ id: 'hiz', label: 'HIZ', def: 'orta', choices: [['kolay', 'YAVAŞ'], ['orta', 'NORMAL'], ['zor', 'HIZLI']] }],
    help: [
      ['AMAÇ', ['Elmaları yiyerek uza. Duvara, kendine ya da diğer yılana çarpma.', 'Altın yıldız kısa süre kalır ve 50 puan verir.']],
      ['KONTROLLER', ['Tek oyuncu: ok tuşları ya da <kbd>WASD</kbd>. Dokunmatikte kaydır.', 'İki oyuncu: 1. oyuncu (yeşil) <kbd>WASD</kbd>, 2. oyuncu (pembe) ok tuşları.', '<kbd>P</kbd> duraklatır.']],
    ],
  },
  {
    id: 'robo', name: 'PİKSEL KAÇIŞ', short: 'Piksel Kaçış', tag: '2D', players: 'TEK OYUNCU', module: robo,
    blurb: 'Fiyonklu pembe robotla veri topla, virüslerden kaç, EMP ile dondurup temizle.',
    modes: SOLO,
    options: [{ id: 'zorluk', label: 'ZORLUK', def: 'orta', choices: [['kolay', 'KOLAY'], ['orta', 'NORMAL'], ['zor', 'ZOR']] }],
    help: [
      ['AMAÇ', ['Fiyonklu pembe robotla labirentteki bütün veri noktalarını topla, sonraki bölüme geç.']],
      ['KONTROLLER', ['Ok tuşları ya da <kbd>WASD</kbd>. Dokunmatikte kaydır ya da yön tuşlarını kullan.', '<kbd>P</kbd> duraklatır.']],
      ['İPUÇLARI', ['Yanıp sönen çip EMP yükler: virüsler birkaç saniye donar ve zararsız olur.', 'Donmuş virüse dokunursan onu temizlersin: 200, 400, 600… puan. Temizlenen virüs 4 saniye sonra yuvasından geri gelir.', 'Mor ışınlayıcılar seni labirentin öbür ucuna taşır. Disket bonus puandır.']],
    ],
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);

export function defaultOpts(g) {
  const o = { mod: g.modes[0].id };
  for (const opt of g.options) o[opt.id] = opt.def;
  return o;
}

export function normalizeOpts(g, opts) {
  const o = defaultOpts(g);
  if (opts) {
    if (g.modes.some((m) => m.id === opts.mod)) o.mod = opts.mod;
    for (const opt of g.options) if (opt.choices.some((c) => c[0] === opts[opt.id])) o[opt.id] = opts[opt.id];
  }
  return o;
}

export function describeOpts(g, opts) {
  const parts = [];
  const m = g.modes.find((x) => x.id === opts.mod);
  if (m && g.modes.length > 1) parts.push(m.label);
  for (const opt of g.options) {
    if (opt.when && !opt.when(opts)) continue;
    const c = opt.choices.find((x) => x[0] === opts[opt.id]);
    if (c) parts.push(c[1]);
  }
  return parts.join(' · ');
}
