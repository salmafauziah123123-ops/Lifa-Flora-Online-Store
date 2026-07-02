/* ============================================================
   script.js — Lifa Flora E-Commerce (FIXED VERSION)
   ============================================================ */

const STORAGE_PRODUCTS_KEY = "lifaFloraProducts";
const STORAGE_ORDERS_KEY = "lifaFloraOrders";
const STORAGE_USERS_KEY = "lifaFloraUsers";
const STORAGE_SESSION_KEY = "lifaFloraSession";
const STORAGE_CART_PERSIST_KEY = "lifaFloraCartPersist";
const STORAGE_LAST_ORDER_KEY = "lifaFloraLastOrder";

/* ---------- Auth helpers ---------- */
function getSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SESSION_KEY)); } catch { return null; }
}
function setSession(s) { localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(STORAGE_SESSION_KEY); }

function getUsers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY)) || []; } catch { return []; }
}
function saveUsers(u) { localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(u)); }

function logoutUser() {
  clearSession();
  updateNavAuth();
  showToast("👋 Berhasil keluar.");
}

function updateNavAuth() {
  const session = getSession();
  const loginItem = document.getElementById("navLoginItem");
  const userItem = document.getElementById("navUserItem");
  const userName = document.getElementById("navUserName");
  if (!loginItem || !userItem) return;
  if (session && session.nama) {
    loginItem.style.display = "none";
    userItem.style.display = "flex";
    if (userName) userName.textContent = "👤 " + session.nama;
  } else {
    loginItem.style.display = "";
    userItem.style.display = "none";
  }
}

let firebaseHelpers = null;

async function loadFirebaseHelpers() {
  if (firebaseHelpers) return firebaseHelpers;
  try {
    const mod = await import("./firebase-config.js");
    firebaseHelpers = {
      getProductsFromFirestore: mod.getProductsFromFirestore,
      saveProductsToFirestore: mod.saveProductsToFirestore,
      listenProducts: mod.listenProducts
    };
  } catch (e) {
    console.warn("Firebase unavailable, using local fallback.", e);
    firebaseHelpers = {
      getProductsFromFirestore: async () => null,
      saveProductsToFirestore: async () => false,
      listenProducts: () => () => {}
    };
  }
  return firebaseHelpers;
}

/* ---------- Order persistence ---------- */
function getLastOrder() {
  try { return JSON.parse(localStorage.getItem(STORAGE_LAST_ORDER_KEY)); } catch { return null; }
}
function saveLastOrder(o) { localStorage.setItem(STORAGE_LAST_ORDER_KEY, JSON.stringify(o)); }

function getAllOrders() {
  try { return JSON.parse(localStorage.getItem("lifaFloraAllOrders")) || []; } catch { return []; }
}
function saveAllOrders(arr) { localStorage.setItem("lifaFloraAllOrders", JSON.stringify(arr)); }

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

const defaultProducts = [
  { id:1, name:"Rose Elegance", price:185000, emoji:"🌹", image:"images/rose.jpg", desc:"Buket mawar merah premium, cocok untuk anniversary atau ungkapan cinta.", category:"anniversary", hot:true, stock: 8, sold: 1200 },
  { id:2, name:"Cherry Blossom Dream", price:165000, emoji:"🌸", image:"images/chery blosoom.jpeg", desc:"Buket bunga sakura pastel lembut, tampilan aesthetic dan romantis.", category:"ulang tahun", hot:false, stock: 10, sold: 856 },
  { id:3, name:"Sunflower Glow", price:145000, emoji:"🌻", image:"images/sunflower glow.jpeg", desc:"Buket bunga matahari ceria, cocok untuk teman wisuda atau hadiah.", category:"wisuda", hot:true, stock: 12, sold: 2100 },
  { id:4, name:"Pastel Tulip", price:175000, emoji:"🌷", image:"images/pastel tulip.jpeg", desc:"Buket tulip warna pastel campuran, elegan dan modern.", category:"anniversary", hot:false, stock: 9, sold: 634 },
  { id:5, name:"Mix Garden", price:210000, emoji:"💐", image:"images/mix garden.jpeg", desc:"Buket campur berbagai bunga segar pilihan, tampil mewah dan penuh warna.", category:"ulang tahun", hot:true, stock: 6, sold: 1500 },
  { id:6, name:"Wisuda Prestasi", price:155000, emoji:"🎓", image:"images/wisuda.jpeg", desc:"Spesial untuk wisudawan, dikemas dengan pita emas dan ucapan selamat.", category:"wisuda", hot:false, stock: 11, sold: 980 },
  { id:7, name:"Lavender Kiss", price:195000, emoji:"💜", image:"images/lavender kiss.jpeg", desc:"Buket lavender ungu memikat, aromaterapi alami dan visual cantik.", category:"custom", hot:false, stock: 7, sold: 412 },
  { id:8, name:"White Lily Pure", price:225000, emoji:"🤍", image:"images/white lili.jpeg", desc:"Buket lily putih bersih dan mewah, cocok untuk acara formal dan pernikahan.", category:"custom", hot:true, stock: 5, sold: 1780 },
  { id:9, name:"Blue Serenity Bouquet 💙", price:215000, emoji:"💙", image:"images/Blue_Serenity_Bouquest.jpeg", desc:"Perpaduan bunga segar bernuansa putih dan biru yang elegan, melambangkan ketulusan, kesetiaan, dan cinta yang abadi. Cocok sebagai hadiah anniversary yang berkesan.", category:"anniversary", hot:true, stock: 7, sold: 540 },
  { id:10, name:"Sweet Romance", price:190000, emoji:"💕", image:"images/Sweet_Romance_.jpeg", desc:"Buket bunga segar dengan dominasi mawar pink dan bunga putih yang manis. Pilihan sempurna untuk mengungkapkan cinta dan merayakan momen anniversary bersama orang tersayang.", category:"anniversary", hot:false, stock: 9, sold: 765 },
  { id:11, name:"Pink Harmoni", price:180000, emoji:"🌸", image:"images/Pink_Harmony.jpeg", desc:"Rangkaian bunga segar bernuansa pastel yang lembut dan anggun. Hadiah istimewa untuk merayakan hari jadi dengan penuh cinta dan kebahagiaan.", category:"anniversary", hot:false, stock: 8, sold: 392 },
  { id:12, name:"Elegant Matcha Edition", price:205000, emoji:"🍵", image:"images/Elegant_Matcha_Edition_.jpeg", desc:"Hadirkan kesan elegan dan menenangkan dengan kombinasi mawar putih yang melambangkan kemurnian dan sentuhan sage green yang segar. Buket ini untuk memberikan momen tak terlupakan di hari spesial pada orang tersayang.", category:"ulang tahun", hot:false, stock: 6, sold: 318 },
  { id:13, name:"Sapphire Wishes", price:235000, emoji:"💎", image:"images/Sapphire_Wishes.jpeg", desc:"Buket eksklusif ini memadukan bunga tulip biru yang unik (simbol ketenangan dan kedamaian) dengan mawar putih serta eustoma yang melambangkan ketulusan. Rangkaian ini dipercantik dengan sentuhan bunga pendukung berwarna biru muda dan putih, menciptakan gradasi warna yang sangat memukau dan modern.", category:"ulang tahun", hot:true, stock: 5, sold: 689 },
  { id:14, name:"Sunshine Birthday Blooms", price:198000, emoji:"☀️", image:"images/Sunshine_Birthday_Blooms.jpeg", desc:"Rayakan momen spesial dengan kehangatan 'Golden Sunset Bliss'. Buket ini memadukan mawar premium, ranunculus, dan aksen bunga kering yang dirangkai secara estetis dengan wrapping bernuansa earthy yang elegan. Pilihan sempurna untuk memberikan kejutan ulang tahun yang penuh keceriaan dan kesan tak terlupakan.", category:"ulang tahun", hot:false, stock: 8, sold: 451 },
  { id:15, name:"Chocolate Lily", price:220000, emoji:"🍫", image:"images/Chocolate_Lily.jpeg", desc:"Hadirkan kesan mewah dan hangat dengan buket perpaduan bunga Lily pink yang anggun serta bunga nuansa cokelat yang elegan. Dirangkai secara profesional dengan kertas wrapping premium berwarna cokelat gelap (dark brown) untuk menonjolkan keindahan kelopak bunga.", category:"custom", hot:false, stock: 7, sold: 276 },
  { id:16, name:"Summer Sunshine Garden", price:260000, emoji:"🌻", image:"images/Summer_Sunshine_Garden.jpeg", desc:"Buket megah berukuran besar yang membawa keindahan kebun bunga langsung ke tangan Anda. Menampilkan pusat perhatian bunga Matahari yang cerah, dikelilingi oleh kombinasi cantik bunga Gerbera, Mawar multi-warna, Lili putih, Carnation, dan Daisy kecil. Setiap jenis bunga dibungkus rapi satu per satu secara terpisah menggunakan kertas putih premium (cone wrapping style) untuk menciptakan visual yang penuh, berdimensi, dan sangat mewah.", category:"custom", hot:true, stock: 4, sold: 905 },
  { id:17, name:"Midnight Dusk Premium", price:245000, emoji:"🌑", image:"images/Midnight_Dusk_Premium.jpeg", desc:"Buket bunga modern bernuansa cool-tone yang misterius dan mewah. Memadukan mawar dusty pink, mawar abu-abu, dan anggrek kelabu yang unik, dibalut kertas wrapping hitam pekat premium serta aksen kraft honeycomb.", category:"custom", hot:false, stock: 6, sold: 357 },
  { id:18, name:"Sweet Bloom Wisuda", price:175000, emoji:"🎀", image:"images/Sweet_Bloom_Wisuda.jpeg", desc:"Rayakan momen kelulusan dengan buket bunga segar bernuansa pink dan putih, dilengkapi boneka bunga wisuda yang menggemaskan.", category:"wisuda", hot:true, stock: 10, sold: 612 }
];

/* Data ulasan awal (seed) supaya rating & ulasan setiap produk tidak kosong */
const defaultReviews = {
  1: [
    { id:"seed_1_1", productId:1, userId:null, name:"Nabila A.", rating:5, text:"Buketnya cantik banget, sesuai foto. Bunganya rapi dan pengemasannya aman. Puas belanja di sini.", createdAt:"2026-05-09T09:00:00.000Z" },
    { id:"seed_1_2", productId:1, userId:null, name:"Andi Saputra", rating:5, text:"Pacar saya suka banget sama buketnya. Harganya juga masih terjangkau.", createdAt:"2026-05-19T09:00:00.000Z" },
    { id:"seed_1_3", productId:1, userId:null, name:"Rafi Maulana", rating:5, text:"Buket anniversary-nya elegan. Pengiriman cepat dan tidak ada yang rusak.", createdAt:"2026-06-01T09:00:00.000Z" }
  ],
  2: [
    { id:"seed_2_1", productId:2, userId:null, name:"Salsa Putri", rating:5, text:"Adminnya ramah dan fast respon. Buketnya juga wangi dan tampilannya mewah.", createdAt:"2026-05-10T09:00:00.000Z" },
    { id:"seed_2_2", productId:2, userId:null, name:"Maya Cahyani", rating:5, text:"Kombinasi warnanya manis banget. Foto dan barang asli sama persis.", createdAt:"2026-05-24T09:00:00.000Z" }
  ],
  3: [
    { id:"seed_3_1", productId:3, userId:null, name:"Rizky H.", rating:5, text:"Pesanan datang tepat waktu. Cocok buat hadiah wisuda, hasilnya bikin yang nerima senang.", createdAt:"2026-05-11T09:00:00.000Z" },
    { id:"seed_3_2", productId:3, userId:null, name:"Vina Oktavia", rating:5, text:"Admin komunikatif dan pengerjaannya cepat. Buket wisudanya cantik banget.", createdAt:"2026-05-26T09:00:00.000Z" },
    { id:"seed_3_3", productId:3, userId:null, name:"Fahmi Akbar", rating:5, text:"Pelayanan baik, kualitas bagus, harga sesuai. Tidak mengecewakan.", createdAt:"2026-06-07T09:00:00.000Z" }
  ],
  4: [
    { id:"seed_4_1", productId:4, userId:null, name:"Dimas Kurniawan", rating:5, text:"Awalnya ragu beli online, ternyata hasilnya bagus banget. Recommended!", createdAt:"2026-05-08T09:00:00.000Z" },
    { id:"seed_4_2", productId:4, userId:null, name:"Yusuf Firmansyah", rating:5, text:"Pesan untuk hadiah anniversary, hasilnya elegan dan pasangan saya suka.", createdAt:"2026-05-22T09:00:00.000Z" }
  ],
  5: [
    { id:"seed_5_1", productId:5, userId:null, name:"Fitri Handayani", rating:5, text:"Warna buketnya cantik dan sesuai request. Terima kasih sudah dibuatkan dengan rapi.", createdAt:"2026-05-12T09:00:00.000Z" },
    { id:"seed_5_2", productId:5, userId:null, name:"Bunga Rahma", rating:5, text:"Terima kasih, buketnya sesuai keinginan dan selesai tepat waktu.", createdAt:"2026-05-27T09:00:00.000Z" },
    { id:"seed_5_3", productId:5, userId:null, name:"Dewi Anggraini", rating:5, text:"Packaging aman, buket sampai dalam kondisi sempurna. Recommended seller.", createdAt:"2026-06-09T09:00:00.000Z" }
  ],
  6: [
    { id:"seed_6_1", productId:6, userId:null, name:"Lina Maharani", rating:5, text:"Sudah dua kali pesan di sini, kualitasnya tetap bagus. Pasti order lagi.", createdAt:"2026-05-13T09:00:00.000Z" },
    { id:"seed_6_2", productId:6, userId:null, name:"Kevin Pratama", rating:5, text:"Pesan mendadak tapi tetap dilayani dengan baik. Hasilnya keren.", createdAt:"2026-05-28T09:00:00.000Z" }
  ],
  7: [
    { id:"seed_7_1", productId:7, userId:null, name:"Nurul S.", rating:5, text:"Hasilnya lebih bagus dari ekspektasi. Detailnya rapi dan kelihatan premium.", createdAt:"2026-05-14T09:00:00.000Z" },
    { id:"seed_7_2", productId:7, userId:null, name:"Arif Nugroho", rating:5, text:"Harga bersahabat, kualitas tidak murahan. Sangat puas dengan hasilnya.", createdAt:"2026-05-30T09:00:00.000Z" }
  ],
  8: [
    { id:"seed_8_1", productId:8, userId:null, name:"Fajar Ramadhan", rating:5, text:"Pelayanannya memuaskan, admin sabar menjawab pertanyaan. Buketnya cantik.", createdAt:"2026-05-15T09:00:00.000Z" },
    { id:"seed_8_2", productId:8, userId:null, name:"Ayu Lestari", rating:5, text:"Cocok banget buat hadiah ulang tahun. Teman saya sampai terharu pas menerimanya.", createdAt:"2026-05-31T09:00:00.000Z" },
    { id:"seed_8_3", productId:8, userId:null, name:"Rina Puspitasari", rating:5, text:"Sudah langganan di sini karena hasilnya selalu memuaskan.", createdAt:"2026-06-10T09:00:00.000Z" }
  ],
  9: [
    { id:"seed_9_1", productId:9, userId:null, name:"Sherina Putri", rating:5, text:"Warna biru putihnya elegan banget, pas buat anniversary kami yang ke-3.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_9_2", productId:9, userId:null, name:"Bagas Wirawan", rating:5, text:"Bunganya segar dan rangkaiannya rapi, suami saya suka banget.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_9_3", productId:9, userId:null, name:"Clara Aulia", rating:5, text:"Konsep warnanya unik, beda dari buket anniversary kebanyakan. Recommended!", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_9_4", productId:9, userId:null, name:"Reza Aditya", rating:5, text:"Pengemasan rapi, sampai dalam keadaan sempurna. Terima kasih Lifa Flora.", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_9_5", productId:9, userId:null, name:"Tasya Amelia", rating:5, text:"Cantik banget, melambangkan kesetiaan persis seperti deskripsinya.", createdAt:"2026-06-20T09:00:00.000Z" }
  ],
  10: [
    { id:"seed_10_1", productId:10, userId:null, name:"Devi Oktaviani", rating:5, text:"Romantis banget, pas buat surprise anniversary pasangan saya.", createdAt:"2026-06-11T09:00:00.000Z" },
    { id:"seed_10_2", productId:10, userId:null, name:"Farhan Hidayat", rating:5, text:"Mawar pink-nya segar dan harum, istri saya langsung terharu.", createdAt:"2026-06-13T09:00:00.000Z" },
    { id:"seed_10_3", productId:10, userId:null, name:"Intan Permatasari", rating:5, text:"Manis banget tampilannya, sesuai foto di katalog.", createdAt:"2026-06-15T09:00:00.000Z" },
    { id:"seed_10_4", productId:10, userId:null, name:"Galang Saputra", rating:5, text:"Pengiriman cepat, packing aman, bunganya tahan lama.", createdAt:"2026-06-17T09:00:00.000Z" },
    { id:"seed_10_5", productId:10, userId:null, name:"Putri Anjani", rating:5, text:"Worth it banget buat momen spesial, recommended seller!", createdAt:"2026-06-19T09:00:00.000Z" }
  ],
  11: [
    { id:"seed_11_1", productId:11, userId:null, name:"Mira Setyawati", rating:5, text:"Warna pastelnya lembut dan anggun, cocok buat hadiah anniversary mama papa.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_11_2", productId:11, userId:null, name:"Doni Pranata", rating:5, text:"Rangkaiannya rapi banget, harum dan segar pas sampai.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_11_3", productId:11, userId:null, name:"Sekar Wulandari", rating:5, text:"Suka banget sama nuansa pastelnya, elegan tapi tetap manis.", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_11_4", productId:11, userId:null, name:"Wahyu Ramadhan", rating:5, text:"Pesan untuk hari jadi orang tua, hasilnya bikin mereka senang.", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_11_5", productId:11, userId:null, name:"Anggita Rahmah", rating:5, text:"Kualitas bunga premium, harga sebanding dengan hasilnya.", createdAt:"2026-06-20T09:00:00.000Z" }
  ],
  12: [
    { id:"seed_12_1", productId:12, userId:null, name:"Naufal Akbar", rating:5, text:"Konsepnya unik, perpaduan putih dan sage green-nya elegan banget.", createdAt:"2026-06-11T09:00:00.000Z" },
    { id:"seed_12_2", productId:12, userId:null, name:"Hana Safitri", rating:5, text:"Buat kado ulang tahun teman, dia suka banget sama nuansa calm-nya.", createdAt:"2026-06-13T09:00:00.000Z" },
    { id:"seed_12_3", productId:12, userId:null, name:"Brian Maulana", rating:5, text:"Beda dari buket biasa, kelihatan elegan dan menenangkan.", createdAt:"2026-06-15T09:00:00.000Z" },
    { id:"seed_12_4", productId:12, userId:null, name:"Dinda Larasati", rating:5, text:"Mawar putihnya segar, sage green-nya kasih sentuhan estetik banget.", createdAt:"2026-06-17T09:00:00.000Z" },
    { id:"seed_12_5", productId:12, userId:null, name:"Eka Suryadi", rating:5, text:"Hasil sesuai foto, pengiriman tepat waktu. Puas banget!", createdAt:"2026-06-19T09:00:00.000Z" }
  ],
  13: [
    { id:"seed_13_1", productId:13, userId:null, name:"Citra Permatasari", rating:5, text:"Tulip birunya unik banget, jarang ada yang jual model begini.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_13_2", productId:13, userId:null, name:"Yoga Pranata", rating:5, text:"Gradasi warnanya cantik banget, kelihatan modern dan eksklusif.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_13_3", productId:13, userId:null, name:"Aulia Rahman", rating:5, text:"Buat kado ulang tahun pacar, dia kaget liat keunikan warnanya.", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_13_4", productId:13, userId:null, name:"Bella Anastasya", rating:5, text:"Rangkaian bunga pendukungnya rapi, hasil akhirnya memukau.", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_13_5", productId:13, userId:null, name:"Fikri Ananda", rating:5, text:"Worth the price, kualitas premium dan benar-benar eksklusif.", createdAt:"2026-06-20T09:00:00.000Z" }
  ],
  14: [
    { id:"seed_14_1", productId:14, userId:null, name:"Laras Ayu", rating:5, text:"Wrapping earthy-nya estetik banget, cocok buat kado ulang tahun.", createdAt:"2026-06-11T09:00:00.000Z" },
    { id:"seed_14_2", productId:14, userId:null, name:"Dimas Prasetyo", rating:5, text:"Mawar dan ranunculusnya segar, aksen bunga keringnya unik.", createdAt:"2026-06-13T09:00:00.000Z" },
    { id:"seed_14_3", productId:14, userId:null, name:"Zahra Amalia", rating:5, text:"Kejutan ulang tahun jadi makin berkesan, makasih Lifa Flora.", createdAt:"2026-06-15T09:00:00.000Z" },
    { id:"seed_14_4", productId:14, userId:null, name:"Adit Wijaya", rating:5, text:"Tampilannya hangat dan ceria, sesuai sama nama produknya.", createdAt:"2026-06-17T09:00:00.000Z" },
    { id:"seed_14_5", productId:14, userId:null, name:"Gita Lestari", rating:5, text:"Detail rangkaiannya rapi, hasilnya lebih bagus dari ekspektasi.", createdAt:"2026-06-19T09:00:00.000Z" }
  ],
  15: [
    { id:"seed_15_1", productId:15, userId:null, name:"Putra Wibowo", rating:5, text:"Kombinasi lily pink dan nuansa cokelatnya mewah banget.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_15_2", productId:15, userId:null, name:"Indah Permata", rating:5, text:"Wrapping dark brown-nya elegan, beda dari buket lain.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_15_3", productId:15, userId:null, name:"Reno Saputra", rating:5, text:"Bunga lily-nya segar dan harum, pas buat kado custom spesial.", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_15_4", productId:15, userId:null, name:"Vania Kusuma", rating:5, text:"Tampilannya mewah, kelihatan effort banget dibuatnya.", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_15_5", productId:15, userId:null, name:"Hafiz Ramadhan", rating:5, text:"Hasilnya sesuai foto, paket aman sampai tujuan.", createdAt:"2026-06-20T09:00:00.000Z" }
  ],
  16: [
    { id:"seed_16_1", productId:16, userId:null, name:"Siti Nurhaliza", rating:5, text:"Buketnya besar dan penuh warna, beneran kayak kebun bunga!", createdAt:"2026-06-11T09:00:00.000Z" },
    { id:"seed_16_2", productId:16, userId:null, name:"Ardi Kurniawan", rating:5, text:"Cone wrapping-nya rapi banget, kelihatan mewah dan berdimensi.", createdAt:"2026-06-13T09:00:00.000Z" },
    { id:"seed_16_3", productId:16, userId:null, name:"Nadia Salsabila", rating:5, text:"Kombinasi gerbera, mawar, dan lili-nya cantik banget, puas banget!", createdAt:"2026-06-15T09:00:00.000Z" },
    { id:"seed_16_4", productId:16, userId:null, name:"Bima Nugraha", rating:5, text:"Ukurannya gede sesuai deskripsi, cocok buat hadiah spesial.", createdAt:"2026-06-17T09:00:00.000Z" },
    { id:"seed_16_5", productId:16, userId:null, name:"Olivia Putri", rating:5, text:"Bunganya segar semua, tahan lama sampai seminggu lebih.", createdAt:"2026-06-19T09:00:00.000Z" }
  ],
  17: [
    { id:"seed_17_1", productId:17, userId:null, name:"Kevin Aditama", rating:5, text:"Nuansa cool-tone-nya unik dan misterius, beda dari yang lain.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_17_2", productId:17, userId:null, name:"Rara Anindya", rating:5, text:"Anggrek kelabunya cantik banget, wrapping hitamnya premium.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_17_3", productId:17, userId:null, name:"Surya Pratama", rating:5, text:"Aksen honeycomb-nya kasih sentuhan mewah, suka banget!", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_17_4", productId:17, userId:null, name:"Talita Zahra", rating:5, text:"Cocok buat hadiah custom yang beda dari biasanya, elegan banget.", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_17_5", productId:17, userId:null, name:"Bayu Firmansyah", rating:5, text:"Mawar dusty pink dan abu-abunya serasi banget, hasil memuaskan.", createdAt:"2026-06-20T09:00:00.000Z" }
  ],
  18: [
    { id:"seed_18_1", productId:18, userId:null, name:"Aisyah Putri", rating:5, text:"Boneka bunga wisudanya lucu banget, bikin momen kelulusan makin berkesan.", createdAt:"2026-06-12T09:00:00.000Z" },
    { id:"seed_18_2", productId:18, userId:null, name:"Fadli Ramadhan", rating:5, text:"Warna pink putihnya manis, pas buat kado wisuda adik.", createdAt:"2026-06-14T09:00:00.000Z" },
    { id:"seed_18_3", productId:18, userId:null, name:"Cindy Marshanda", rating:5, text:"Bunganya segar dan bonekanya menggemaskan, recommended seller!", createdAt:"2026-06-16T09:00:00.000Z" },
    { id:"seed_18_4", productId:18, userId:null, name:"Rio Saputra", rating:5, text:"Sampai tepat waktu pas hari wisuda, makasih Lifa Flora!", createdAt:"2026-06-18T09:00:00.000Z" },
    { id:"seed_18_5", productId:18, userId:null, name:"Niken Larasati", rating:5, text:"Hadiah wisuda paling estetik yang pernah saya kasih ke teman.", createdAt:"2026-06-20T09:00:00.000Z" }
  ]
};

let products = [];
let cart = [];
let orders = [];
let currentFilter = "semua";
let detailReady = false;

function hideDetailView() {
  const detailSection = document.getElementById("detailView");
  const productsGrid = document.getElementById("productsGrid");
  const detailNotFound = document.getElementById("detailNotFound");
  if (detailSection) {
    detailSection.style.display = "none";
    detailSection.classList.remove("fade-in-right");
    detailSection.classList.add("fade-out-left");
  }
  if (productsGrid) productsGrid.style.display = "grid";
  if (detailNotFound) detailNotFound.style.display = "none";
}

let searchQuery = "";
let appliedVoucher = null;

function saveState() {
  localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  localStorage.setItem(STORAGE_CART_PERSIST_KEY, JSON.stringify(cart));
}

async function loadState() {
  const storedOrders = localStorage.getItem(STORAGE_ORDERS_KEY);
  const storedCart   = localStorage.getItem(STORAGE_CART_PERSIST_KEY);
  orders = storedOrders ? JSON.parse(storedOrders) : [];
  cart   = storedCart   ? JSON.parse(storedCart)   : [];
  if (!Array.isArray(orders)) orders = [];
  if (!Array.isArray(cart))   cart   = [];

  const fb = await loadFirebaseHelpers();

  /* Coba ambil produk dari Firestore */
  try {
    const firestoreProducts = await fb.getProductsFromFirestore();
    if (firestoreProducts && firestoreProducts.length > 0) {
      products = firestoreProducts;
      /* Kalau Firestore masih kosong (pertama kali), upload defaultProducts */
    } else {
      products = [...defaultProducts];
      await fb.saveProductsToFirestore(defaultProducts);
    }
  } catch (e) {
    /* Fallback ke localStorage kalau Firestore error */
    const storedProducts = localStorage.getItem(STORAGE_PRODUCTS_KEY);
    products = storedProducts ? JSON.parse(storedProducts) : [...defaultProducts];
  }
  if (!Array.isArray(products)) products = [...defaultProducts];

  /* Listen perubahan produk realtime dari Firestore */
  fb.listenProducts((updatedProducts) => {
    if (updatedProducts && updatedProducts.length > 0) {
      products = updatedProducts;
      renderProducts(currentFilter);
      injectRatingToCards();
    }
  });
}

const vouchers = {
  LIFA10: { value: 10, maxDiscount: 50000 }
};

function formatPrice(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function getFilteredProducts(filter = currentFilter) {
  const categoryFiltered = filter === "semua"
    ? products
    : products.filter(product => product.category === filter);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return categoryFiltered;

  return categoryFiltered.filter(product => {
    const haystack = `${product.name} ${product.desc} ${product.category} ${product.emoji}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

let lastSelectedProductId = null;

function showProductDetail(id) {
  const normalizedId = Number(id);
  lastSelectedProductId = normalizedId;

  const detailSection = document.getElementById("detailView");
  const productsSection = document.getElementById("products");
  const detailNotFound = document.getElementById("detailNotFound");
  if (!detailSection || !productsSection) return;

  // Render UI state
  const product = products.find(p => Number(p.id) === normalizedId);

  // Animasi transisi
  detailSection.style.display = "block";
  detailSection.classList.remove("fade-out-left");
  detailSection.classList.add("fade-in-right");

  // Sembunyikan produk grid
  const productsGrid = document.getElementById("productsGrid");
  if (productsGrid) productsGrid.style.display = "none";

  if (detailNotFound) detailNotFound.style.display = product ? "none" : "block";

  if (!product) {
    // reset field
    document.getElementById("detailProductImage") && (document.getElementById("detailProductImage").src = "");
    document.getElementById("detailProductEmoji") && (document.getElementById("detailProductEmoji").textContent = "");
    document.getElementById("detailProductCategory") && (document.getElementById("detailProductCategory").textContent = "-");
    document.getElementById("detailProductName") && (document.getElementById("detailProductName").textContent = "-");
    document.getElementById("detailProductPrice") && (document.getElementById("detailProductPrice").textContent = "-");
    document.getElementById("detailProductStock") && (document.getElementById("detailProductStock").textContent = "-");
    document.getElementById("detailProductDesc") && (document.getElementById("detailProductDesc").textContent = "Produk tidak ditemukan." );
    // tombol disable
    const btn = document.getElementById("detailAddToCartBtn");
    if (btn) btn.disabled = true;
    return;
  }

  // tombol enable
  const btn = document.getElementById("detailAddToCartBtn");
  if (btn) {
    btn.disabled = false;
    // update onclick agar id valid
    btn.setAttribute("onclick", `addToCart(${product.id})`);
  }

  const img = document.getElementById("detailProductImage");
  if (img) img.src = product.foto || product.image || "";

  const emojiEl = document.getElementById("detailProductEmoji");
  if (emojiEl) emojiEl.textContent = product.emoji || "";

  const catEl = document.getElementById("detailProductCategory");
  if (catEl) catEl.textContent = capitalizeFirst(product.category || "-" );

  const nameEl = document.getElementById("detailProductName");
  if (nameEl) nameEl.textContent = product.name || "-";

  const priceEl = document.getElementById("detailProductPrice");
  if (priceEl) priceEl.textContent = formatPrice(product.price || 0);

  const stockCount = Number(product.stock || 0);
  const stockEl = document.getElementById("detailProductStock");
  if (stockEl) {
    stockEl.textContent = stockCount > 0 ? `${stockCount} tersisa` : "Stok habis";
    stockEl.style.color = stockCount > 0 ? "var(--green-deep)" : "#e05050";
  }

  const descEl = document.getElementById("detailProductDesc");
  if (descEl) {
    descEl.textContent = product.desc || "-";
  }

  const ratingDetailEl = document.getElementById("detailProductRating");
  if (ratingDetailEl) {
    const { avg, count } = getProductRating(product.id);
    const soldLabel = formatSoldCount(product.sold || 0);
    ratingDetailEl.innerHTML = `
      <div class="product-stars">${renderStars(avg)}</div>
      ${avg > 0 ? `<span class="product-rating-avg">${avg}</span>` : ""}
      <span class="product-rating-count">(${count} ulasan)</span>
      <button class="review-btn" onclick="openReviewModal(${product.id})">Lihat & Beri Ulasan</button>
      <span class="product-sold-count">Terjual ${soldLabel}</span>`;
  }

  renderProductDetail();
  updateDetailAddToCartButton();
}


function renderProductDetail() {
  // Data detail sudah di-render di showProductDetail.
  // Fungsi ini dibiarkan agar sesuai requirement.
  detailReady = true;
}


function updateDetailAddToCartButton() {
  const btn = document.getElementById("detailAddToCartBtn");
  const detailNotFound = document.getElementById("detailNotFound");
  if (!btn) return;

  const product = products.find(p => Number(p.id) === Number(lastSelectedProductId));
  if (!product) {
    btn.disabled = true;
    btn.setAttribute("onclick", "return false;");
    if (detailNotFound) detailNotFound.style.display = "block";
    return;
  }

  btn.disabled = !(Number(product.stock || 0) > 0);
  btn.setAttribute("onclick", `addToCart(${product.id})`);
}


function backToProducts() {
  const detailSection = document.getElementById("detailView");
  const productsGrid = document.getElementById("productsGrid");
  const detailNotFound = document.getElementById("detailNotFound");
  if (!detailSection) return;

  detailSection.classList.remove("fade-in-right");
  detailSection.classList.add("fade-out-left");

  setTimeout(() => {
    detailSection.style.display = "none";
    if (productsGrid) productsGrid.style.display = "grid";
    if (detailNotFound) detailNotFound.style.display = "none";
    window.scrollTo({ top: document.getElementById("products")?.offsetTop || 0, behavior: "smooth" });
  }, 260);
}

function renderProducts(filter = "semua") { 

  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const filtered = getFilteredProducts(filter);
  filtered.forEach((product, index) => {
    const stockCount = Number(product.stock || 0);
    const inStock = stockCount > 0;
    const stockLabel = inStock ? `${stockCount} tersisa` : `Stok habis`;
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.animationDelay = `${index * 0.07}s`;
    card.innerHTML = `
      <div class="product-img-wrapper">
        ${(product.foto || product.image)
          ? `<img src="${product.foto || product.image}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
             <div class="product-emoji" style="display:none">${product.emoji}</div>`
          : `<div class="product-emoji">${product.emoji}</div>`}
        <span class="product-badge">${capitalizeFirst(product.category)}</span>
        ${product.hot ? '<span class="product-badge badge-hot">🔥 Terlaris</span>' : ""}
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.desc}</p>
        <div class="product-stock">${stockLabel}</div>
          <div class="product-footer">
          <div class="product-price" style="display:flex;flex-direction:column;gap:0.25rem;">
            <span>${formatPrice(product.price)}</span>
            <button class="see-detail-btn" type="button" onclick="showProductDetail(${product.id})" ${inStock ? '' : ''}>
              <i class="fa-solid fa-eye"></i> Lihat Detail
            </button>
          </div>
          <button class="add-cart-btn" onclick="addToCart(${product.id})" ${inStock ? "" : "disabled"}>+ Keranjang</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-light);"><div style="font-size:3rem;margin-bottom:1rem">🌿</div><p>Belum ada produk dalam kategori ini.</p></div>`;
  }
  // Inject rating & ulasan ke setiap kartu produk
  setTimeout(injectRatingToCards, 50);
}

function recordOrder(orderData) {
  orders.push(orderData);
  saveState();
}

function capitalizeFirst(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function filterProducts(category, btn) {
  currentFilter = category;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const matchedBtn = document.querySelector(`.filter-btn[data-category="${category}"]`);
    if (matchedBtn) matchedBtn.classList.add("active");
  }
  renderProducts(category);
}

  function openCategory(category) {
  filterProducts(category);
  // jika user sebelumnya di detailView, sembunyikan detail
  hideDetailView();

  const productsSection = document.getElementById("products");
  if (productsSection) {
    const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
    const topPosition = productsSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 16;
    window.scrollTo({ top: topPosition, behavior: "smooth" });
  }
}

function handleProductSearch(event) {
  searchQuery = event.target.value;
  renderProducts(currentFilter);
}

function submitProductSearch() {
  const input = document.getElementById("productSearch");
  if (input) {
    searchQuery = input.value;
    renderProducts(currentFilter);
    input.focus();
  }
}

function createPetalBurst(x, y) {
  const colors = ["#F4A7B9", "#E8758F", "#B5D5C5", "#FFFFFF"];
  const petals = 16;

  for (let i = 0; i < petals; i += 1) {
    const petal = document.createElement("span");
    petal.className = "petal-burst";
    petal.style.left = `${x}px`;
    petal.style.top = `${y}px`;
    petal.style.background = colors[i % colors.length];
    petal.style.setProperty("--tx", `${(Math.random() - 0.5) * 120}px`);
    petal.style.setProperty("--ty", `${(Math.random() - 0.5) * 140 - 70}px`);
    petal.style.setProperty("--rot", `${Math.random() * 360}deg`);
    document.body.appendChild(petal);
    setTimeout(() => petal.remove(), 1200);
  }
}

function addToCart(productId) {
  const normalizedId = Number(productId);
  const product = products.find(p => Number(p.id) === normalizedId);
  if (!product) return;

  const existingItem = cart.find(item => Number(item.id) === normalizedId);
  const currentQty = existingItem ? existingItem.qty : 0;
  if (currentQty + 1 > product.stock) {
    showToast("⚠️ Stok produk tidak mencukupi.");
    return;
  }

  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, emoji: product.emoji, foto: product.foto || product.image || null, qty: 1 });
  }

  const button = document.querySelector(`button[onclick="addToCart(${product.id})"]`);
  if (button) {
    const rect = button.getBoundingClientRect();
    createPetalBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  updateCartUI();
  showToast(`🌸 "${product.name}" ditambahkan ke keranjang!`);
}

function changeQty(productId, delta) {
  const normalizedId = Number(productId);
  const item = cart.find(i => Number(i.id) === normalizedId);
  if (!item) return;

  const product = products.find(p => p.id === normalizedId);
  if (delta > 0 && product && item.qty + delta > Number(product.stock || 0)) {
    showToast("⚠️ Tidak bisa menambah. Stok produk terbatas.");
    return;
  }

  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => Number(i.id) !== normalizedId);
  updateCartUI();
}

function removeFromCart(productId) {
  const normalizedId = Number(productId);
  cart = cart.filter(i => Number(i.id) !== normalizedId);
  updateCartUI();
  showToast("❌ Item dihapus dari keranjang.");
}

function clearCart() {
  if (cart.length === 0) return;
  showConfirmModal("Kosongkan Keranjang?", "Semua item akan dihapus dari keranjang.", () => {
    cart = [];
    updateCartUI();
    showToast("🗑️ Keranjang dikosongkan.");
  });
}

function getCartSummary() {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  let discount = 0;

  if (appliedVoucher && subtotal > 0 && totalItems >= 2) {
    const voucher = vouchers[appliedVoucher.code];
    if (voucher) {
      discount = Math.min(subtotal * (voucher.value / 100), voucher.maxDiscount || subtotal);
    }
  }

  return {
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    totalItems
  };
}

function renderVoucherStatus() {
  const statusEl = document.getElementById("voucherStatus");
  if (!statusEl) return;

  if (!appliedVoucher) {
    statusEl.textContent = "Masukkan kode voucher untuk dapat diskon.";
    statusEl.className = "voucher-status";
    return;
  }

  const summary = getCartSummary();
  if (summary.totalItems < 2) {
    statusEl.innerHTML = `<span class="voucher-status-text">Voucher ${appliedVoucher.code} hanya berlaku untuk minimal 2 produk.</span>`;
    statusEl.className = "voucher-status";
    return;
  }

  statusEl.innerHTML = `<span class="voucher-status-text success">Voucher ${appliedVoucher.code} aktif • diskon ${formatPrice(summary.discount)}</span>`;
  statusEl.className = "voucher-status voucher-status--success";
}

function applyVoucherCode() {
  const voucherEl = document.getElementById("coVoucher") || document.getElementById("voucherInput");
  const code = voucherEl?.value.trim().toUpperCase();

  if (!code) {
    showToast("⚠️ Masukkan kode voucher terlebih dahulu.");
    return;
  }

  if (!vouchers[code]) {
    appliedVoucher = null;
    renderVoucherStatus();
    if (voucherEl) voucherEl.value = "";
    if (window.__checkoutRecompute) window.__checkoutRecompute();
    showToast("❌ Kode voucher tidak valid. Gunakan LIFA10.");
    return;
  }

  if (cart.reduce((sum, item) => sum + Number(item.qty || 0), 0) < 2) {
    appliedVoucher = null;
    renderVoucherStatus();
    if (voucherEl) voucherEl.value = "";
    if (window.__checkoutRecompute) window.__checkoutRecompute();
    showToast("⚠️ Voucher hanya bisa dipakai saat keranjang minimal 2 produk.");
    return;
  }

  appliedVoucher = { code };
  if (voucherEl) voucherEl.value = code;
  renderVoucherStatus();
  updateCartUI();
  if (window.__checkoutRecompute) window.__checkoutRecompute();
  showToast(`🎟️ Voucher ${code} berhasil diterapkan.`);
}

function applyVoucher() {
  const input = document.getElementById("voucherInput") || document.getElementById("coVoucher");
  if (input) input.value = input.value.trim().toUpperCase();
  applyVoucherCode();
}

function updateCartUI() {
  cart = cart.filter(item => item && Number(item.qty) > 0);
  // Simpan cart ke localStorage agar tersedia di halaman checkout
  localStorage.setItem(STORAGE_CART_PERSIST_KEY, JSON.stringify(cart));

  const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const summary = getCartSummary();
  const countEl = document.getElementById("cartCount");
  if (countEl) {
    countEl.textContent = totalItems > 0 ? totalItems : "0";
    countEl.style.display = totalItems > 0 ? "flex" : "none";
  }

  const cartItemsEl  = document.getElementById("cartItems");
  const cartEmptyEl  = document.getElementById("cartEmpty");
  const cartFooterEl = document.getElementById("cartFooter");
  const subtotalEl   = document.getElementById("subtotalPrice");
  const discountEl    = document.getElementById("discountPrice");
  const totalEl      = document.getElementById("totalPrice");

  if (cart.length === 0) {
    if (cartItemsEl) cartItemsEl.innerHTML = "";
    if (cartEmptyEl) cartEmptyEl.style.display = "flex";
    if (cartItemsEl && cartEmptyEl) cartItemsEl.appendChild(cartEmptyEl);
    if (cartFooterEl) cartFooterEl.style.display = "none";
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (discountEl) discountEl.textContent = "-" + formatPrice(0);
    if (totalEl) totalEl.textContent = formatPrice(0);
    renderVoucherStatus();
    return;
  }

  if (cartEmptyEl) cartEmptyEl.style.display = "none";
  if (cartFooterEl) cartFooterEl.style.display = "block";
  if (cartItemsEl) cartItemsEl.innerHTML = "";
  cart.forEach(item => {
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
        <button class="cart-remove" data-action="remove" data-id="${item.id}">✕</button>
      </div>`;
    if (cartItemsEl) cartItemsEl.appendChild(el);
  });
  if (cartItemsEl) {
    cartItemsEl.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.dataset.id);
      const action = this.dataset.action;
      if (action === "minus")  changeQty(id, -1);
      if (action === "plus")   changeQty(id, +1);
      if (action === "remove") removeFromCart(id);
    });
    });
  }
  if (subtotalEl) subtotalEl.textContent = formatPrice(summary.subtotal);
  if (discountEl) discountEl.textContent = `-${formatPrice(summary.discount)}`;
  if (totalEl) totalEl.textContent = formatPrice(summary.total);
  renderVoucherStatus();
}

function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("cartOverlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("open");
  document.body.style.overflow = sidebar.classList.contains("open") ? "hidden" : "";
}

function checkout() {
  if (cart.length === 0) { showToast("❗ Keranjangmu masih kosong!"); return; }

  const summary = getCartSummary();
  const itemsHTML = cart.map(item => `
    <div class="receipt-item">
      <span class="receipt-emoji">${item.emoji}</span>
      <div class="receipt-item-info">
        <span class="receipt-name">${item.name}</span>
        <span class="receipt-qty">x${item.qty}</span>
      </div>
      <span class="receipt-price">${formatPrice(item.price * item.qty)}</span>
    </div>`).join("");
  const itemsText = cart.map(item => `- ${item.name} x${item.qty} (${formatPrice(item.price * item.qty)})`).join("\n");
  const now = new Date();
  const tgl = now.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const jam = now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" });
  const orderNum = "LF" + Date.now().toString().slice(-6);

  showPaymentModal({ orderNum, tgl, jam, subtotalPrice: summary.subtotal, discountPrice: summary.discount, totalPrice: summary.total, itemsHTML, itemsText });
}

function showPaymentModal(orderData) {
  let overlay = document.getElementById("paymentOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "paymentOverlay";
    overlay.className = "receipt-overlay";
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="receipt-box payment-modal">
      <div class="receipt-header">
        <div class="receipt-flower">🏦</div>
        <h2>Pembayaran</h2>
        <p>Silakan transfer sesuai total pesananmu</p>
      </div>
      <div class="payment-card">
        <p class="payment-label">Transfer ke</p>
        <h3>SeaBank</h3>
        <div class="payment-account">
          <span>No. Rekening</span>
          <strong>901809290073</strong>
        </div>
        <p class="payment-note">Nominal transfer sesuai total pesanan. Untuk setiap pembayaran non-COD, wajib melampirkan transaksi atau bukti pembayaran dan alamat lengkap untuk pengiriman.</p>
      </div>
      <div class="payment-card">
        <p class="payment-label">Biodata</p>
        <div class="payment-field">
          <label for="customerName">Nama Lengkap</label>
          <input type="text" id="customerName" class="payment-input" placeholder="Masukkan nama lengkap Anda" />
        </div>
        <div class="payment-field">
          <label for="customerPhone">Nomor Telepon</label>
          <input type="tel" id="customerPhone" class="payment-input" placeholder="Masukkan nomor telepon Anda" />
        </div>
        <div class="payment-field">
          <label for="customerAddress">Alamat Lengkap</label>
          <textarea id="customerAddress" class="payment-input payment-textarea" rows="3" placeholder="Masukkan alamat lengkap untuk pengiriman"></textarea>
        </div>
      </div>
      <div class="receipt-divider">— Ringkasan Pesanan —</div>
      <div class="receipt-items">${orderData.itemsHTML}</div>
      <div class="receipt-summary">
        <div class="receipt-row"><span>Subtotal</span><span>${formatPrice(orderData.subtotalPrice)}</span></div>
        <div class="receipt-row"><span>Diskon</span><span class="discount-green">-${formatPrice(orderData.discountPrice)}</span></div>
        <div class="receipt-row"><span>Ongkir</span><span class="free-green">✓ GRATIS</span></div>
        <div class="receipt-row receipt-total"><strong>Total Bayar</strong><strong>${formatPrice(orderData.totalPrice)}</strong></div>
      </div>
      <div class="payment-actions">
        <button class="btn btn-outline btn-full" onclick="closePaymentModal()">Batal</button>
        <button class="btn btn-primary btn-full" id="confirmPaymentBtn">Bayar & Kirim ke WhatsApp</button>
      </div>
    </div>`;

  overlay.style.display = "flex";
  setTimeout(() => overlay.classList.add("open"), 10);
  document.body.style.overflow = "hidden";

  const confirmBtn = document.getElementById("confirmPaymentBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      const customerName = document.getElementById("customerName")?.value.trim();
      const customerPhone = document.getElementById("customerPhone")?.value.trim();
      const customerAddress = document.getElementById("customerAddress")?.value.trim();

      if (!customerName || !customerPhone || !customerAddress) {
        showToast("❗ Lengkapi nama, nomor telepon, dan alamat lengkap sebelum lanjut ke WhatsApp.");
        return;
      }

      const voucherText = appliedVoucher ? `Voucher: ${appliedVoucher.code} (diskon ${formatPrice(orderData.discountPrice)})` : "Voucher: tidak ada";
      const waMessage = encodeURIComponent(`🌸 Halo, Selamat datang di Lifa Flora 🌸\n\nTerima kasih sudah melakukan pemesanan 💗 Berikut detail pesanan Anda:\n\n🧾 Detail Pesanan\n* Produk:\n- ${orderData.itemsText.replace(/\n/g, '\n- ')}\nSubtotal: _${formatPrice(orderData.subtotalPrice)}_\nDiskon: _-${formatPrice(orderData.discountPrice)}_\n${voucherText}\nTotal Pembayaran: _${formatPrice(orderData.totalPrice)}_\n\n📌 Informasi Pesanan\n* No. Pesanan: #${orderData.orderNum}\n* Tanggal: ${orderData.tgl} | ${orderData.jam} WIB\n\n💳 Metode Pembayaran\nTransfer SeaBank\nNo. Rekening: 901809290073\n\n👤 Data Pemesan\n* Nama: ${customerName}\n* No. Telepon: ${customerPhone}\n* Alamat: ${customerAddress}\n\n📍 Konfirmasi Pesanan\nMohon kirim bukti pembayaran agar pesanan dapat segera diproses. Pesanan akan diproses setelah pembayaran terverifikasi 💗\n\n🚚 GRATIS ONGKIR untuk area Bandung 🌷`);

      cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          product.stock = Math.max(0, Number(product.stock || 0) - Number(item.qty));
        }
      });

      const order = {
        orderNum: orderData.orderNum,
        date: orderData.tgl,
        time: orderData.jam,
        customerName,
        customerPhone,
        customerAddress,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
        total: orderData.totalPrice,
        discount: orderData.discountPrice,
        voucher: appliedVoucher ? appliedVoucher.code : null
      };
      recordOrder(order);
      saveState();
      window.open(`https://api.whatsapp.com/send?phone=6287710793723&text=${waMessage}`, "_blank");
      closePaymentModal();
      cart = [];
      appliedVoucher = null;
      updateCartUI();
      toggleCart();
      renderProducts(currentFilter);
      showReceiptModal(`
        <div class="receipt-modal">
          <div class="receipt-header">
            <div class="receipt-flower">🌸</div>
            <h2>Pesanan Diterima!</h2>
            <p>Terima kasih sudah memesan di Lifa Flora 💐</p>
          </div>
          <div class="receipt-order-num">
            <span>No. Pesanan</span>
            <strong>#${orderData.orderNum}</strong>
          </div>
          <div class="receipt-date"><span>📅 ${orderData.tgl} · ${orderData.jam} WIB</span></div>
          <div class="receipt-divider">— Rincian Pesanan —</div>
          <div class="receipt-items">${orderData.itemsHTML}</div>
          <div class="receipt-divider"></div>
          <div class="receipt-summary">
            <div class="receipt-row"><span>Subtotal</span><span>${formatPrice(orderData.subtotalPrice)}</span></div>
            <div class="receipt-row"><span>Diskon</span><span class="discount-green">-${formatPrice(orderData.discountPrice)}</span></div>
            <div class="receipt-row"><span>Ongkir</span><span class="free-green">✓ GRATIS</span></div>
            <div class="receipt-row receipt-total"><strong>Total Bayar</strong><strong>${formatPrice(orderData.totalPrice)}</strong></div>
          </div>
          <div class="receipt-note">🏦 Pembayaran via SeaBank: 901809290073<br/>📱 Pesananmu sudah kami kirimkan ke WhatsApp untuk diproses. Harap kirimkan bukti pembayaran dan alamat lengkap jika belum melengkapinya.</div>
          <button class="btn btn-primary btn-full receipt-ok-btn" onclick="closeReceiptModal()">✓ Oke, Terima Kasih!</button>
        </div>`, () => {
        showToast("✅ Pesanan berhasil dikirim ke WhatsApp untuk diproses 💐");
      });
    });
  }
}

function closePaymentModal() {
  const overlay = document.getElementById("paymentOverlay");
  if (overlay) {
    overlay.classList.remove("open");
    setTimeout(() => {
      overlay.style.display = "none";
      overlay.innerHTML = "";
    }, 350);
  }
  document.body.style.overflow = "";
}

let receiptCallback = null;
function showReceiptModal(htmlContent, callback) {
  receiptCallback = callback;
  let overlay = document.getElementById("receiptOverlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.id = "receiptOverlay"; overlay.className = "receipt-overlay"; document.body.appendChild(overlay); }
  overlay.innerHTML = `<div class="receipt-box">${htmlContent}</div>`;
  overlay.style.display = "flex";
  setTimeout(() => overlay.classList.add("open"), 10);
  document.body.style.overflow = "hidden";
}
function closeReceiptModal() {
  const overlay = document.getElementById("receiptOverlay");
  if (overlay) { overlay.classList.remove("open"); setTimeout(() => { overlay.style.display = "none"; }, 350); }
  document.body.style.overflow = "";
  if (receiptCallback) { receiptCallback(); receiptCallback = null; }
}

function showConfirmModal(title, desc, onConfirm) {
  let overlay = document.getElementById("confirmOverlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.id = "confirmOverlay"; overlay.className = "receipt-overlay"; document.body.appendChild(overlay); }
  overlay.innerHTML = `
    <div class="receipt-box confirm-box">
      <div style="font-size:2.5rem;margin-bottom:0.75rem">🗑️</div>
      <h3 style="font-family:'Playfair Display',serif;margin-bottom:0.5rem">${title}</h3>
      <p style="color:var(--text-mid);font-size:0.9rem;margin-bottom:1.5rem">${desc}</p>
      <div style="display:flex;gap:0.75rem">
        <button class="btn btn-outline btn-full" onclick="closeConfirmModal()">Batal</button>
        <button class="btn btn-primary btn-full" id="confirmYesBtn">Ya, Hapus</button>
      </div>
    </div>`;
  overlay.style.display = "flex";
  setTimeout(() => overlay.classList.add("open"), 10);
  document.body.style.overflow = "hidden";
  document.getElementById("confirmYesBtn").addEventListener("click", () => { closeConfirmModal(); onConfirm(); });
}
function closeConfirmModal() {
  const overlay = document.getElementById("confirmOverlay");
  if (overlay) { overlay.classList.remove("open"); setTimeout(() => { overlay.style.display = "none"; }, 350); }
  document.body.style.overflow = "";
}

function closeMenu() {
  const nav = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");
  nav.classList.remove("open");
  document.body.classList.remove("menu-open");
  if (hamburger) hamburger.setAttribute("aria-expanded", "false");
}

function navigateTo(target) {
  const normalized = String(target || "").toLowerCase();
  if (normalized === "loginview") {
    window.location.href = "login.html";
    return;
  }
  if (normalized === "cartview") {
    toggleCart();
    return;
  }
  if (normalized === "homeview") {
    window.location.href = "index.html";
    return;
  }
  if (normalized === "productsview") {
    window.location.href = "index.html#products";
    return;
  }
  if (normalized === "aboutview") {
    window.location.href = "index.html#contact";
    return;
  }
  if (normalized.startsWith("#")) {
    const targetEl = document.querySelector(normalized);
    if (targetEl) targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.href = "index.html";
}

function toggleMenu() {
  const nav = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  if (hamburger) hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => closeMenu());
});

document.addEventListener("click", (event) => {
  const nav = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");
  if (window.innerWidth <= 767 && nav && hamburger && !nav.contains(event.target) && !hamburger.contains(event.target)) {
    closeMenu();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 767) closeMenu();
});

window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 50);
});

window.addEventListener("scroll", () => {
  const sections = ["home", "products", "contact"];
  let current = "home";
  sections.forEach(id => { const s = document.getElementById(id); if (s && window.scrollY >= s.offsetTop - 120) current = id; });
  document.querySelectorAll(".nav-link").forEach(link => { link.classList.toggle("active", link.getAttribute("href") === "#" + current); });
});

function openInfoCardByHash(hash) {
  const normalizedHash = hash.replace("#", "");
  const cards = document.querySelectorAll(".info-card");
  if (!cards.length) return;

  cards.forEach(card => {
    const button = card.querySelector(".info-toggle");
    const panel = card.querySelector(".info-panel");
    const isTarget = card.id === normalizedHash;

    card.classList.toggle("active", isTarget);
    if (button) button.setAttribute("aria-expanded", isTarget ? "true" : "false");
    if (panel) panel.setAttribute("aria-hidden", isTarget ? "false" : "true");
  });

  if (normalizedHash) {
    const targetCard = document.getElementById(normalizedHash);
    if (targetCard) {
      setTimeout(() => {
        const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 0;
        const topPosition = targetCard.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 16;
        window.scrollTo({ top: topPosition, behavior: "smooth" });
      }, 50);
    }
  }
}

function initInfoAccordion() {
  const cards = document.querySelectorAll(".info-card");
  if (!cards.length) return;

  cards.forEach(card => {
    const button = card.querySelector(".info-toggle");
    const panel = card.querySelector(".info-panel");
    if (!button || !panel) return;

    button.addEventListener("click", () => {
      const shouldOpen = !card.classList.contains("active");
      cards.forEach(item => {
        const itemButton = item.querySelector(".info-toggle");
        const itemPanel = item.querySelector(".info-panel");
        item.classList.remove("active");
        if (itemButton) itemButton.setAttribute("aria-expanded", "false");
        if (itemPanel) itemPanel.setAttribute("aria-hidden", "true");
      });

      if (shouldOpen) {
        card.classList.add("active");
        button.setAttribute("aria-expanded", "true");
        panel.setAttribute("aria-hidden", "false");
      }
    });
  });

  openInfoCardByHash(window.location.hash);
}

window.addEventListener("hashchange", () => {
  openInfoCardByHash(window.location.hash);
});

let toastTimeout;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2500);
}

function createConfettiBurst(x, y) {
  const colors = ["#F4A7B9", "#E8758F", "#B5D5C5", "#FFFFFF"];
  const pieces = 26;

  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--tx", `${(Math.random() - 0.5) * 140}px`);
    piece.style.setProperty("--ty", `${(Math.random() - 0.5) * 160 + 90}px`);
    piece.style.setProperty("--rot", `${Math.random() * 360}deg`);
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1250);
  }
}

function copyVoucherCode() {
  const codeEl = document.getElementById("voucherCodeText");
  const code = codeEl?.textContent?.trim();
  const button = document.querySelector(".voucher-copy-btn");
  const side = document.querySelector(".voucher-side");
  if (!code) return;

  const triggerX = side ? side.getBoundingClientRect().left + side.getBoundingClientRect().width / 2 : window.innerWidth / 2;
  const triggerY = side ? side.getBoundingClientRect().top + 36 : 140;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => {
        createConfettiBurst(triggerX, triggerY);
        if (button) {
          button.textContent = "✓ Tersalin";
          button.classList.add("copied");
          setTimeout(() => {
            button.textContent = "Salin Kode";
            button.classList.remove("copied");
          }, 1200);
        }
        showToast(`✅ Kode ${code} disalin!`);
      })
      .catch(() => fallbackCopy(code, triggerX, triggerY));
  } else {
    fallbackCopy(code, triggerX, triggerY);
  }
}

function fallbackCopy(text, x, y) {
  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  createConfettiBurst(x, y);
  showToast(`✅ Kode ${text} disalin!`);
}

function initRevealOnScroll() {
  const elements = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window) || !elements.length) {
    elements.forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  elements.forEach(el => observer.observe(el));
}

function goToCheckout() {
  if (cart.length === 0) { showToast("❗ Keranjangmu masih kosong!"); return; }
  window.location.href = "checkout.html";
}

async function initApp() {
  await loadState();
  renderProducts("semua");
  initInfoAccordion();
  initRevealOnScroll();
  updateNavAuth();
}

/* ============================================================
   AUTH PAGES: login.html / register.html
   ============================================================ */
function initLoginPage() {
  const form = document.getElementById("lfLoginForm");
  if (!form) return;
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      document.getElementById("lfLoginMsg").textContent = "Email atau password salah.";
      return;
    }
    setSession({ id: user.id, nama: user.nama, email: user.email });
    window.location.href = "index.html";
  });
}

function initRegisterPage() {
  const form = document.getElementById("lfRegisterForm");
  if (!form) return;
  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const nama = form.nama.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    if (!nama || !email || !password) return;
    const users = getUsers();
    if (users.some(u => u.email === email)) {
      document.getElementById("lfRegisterMsg").textContent = "Email sudah terdaftar.";
      return;
    }
    users.push({ id: "u_" + Date.now(), nama, email, password });
    saveUsers(users);
    document.getElementById("lfRegisterMsg").textContent = "Akun berhasil dibuat! Mengarahkan ke login...";
    setTimeout(() => { window.location.href = "login.html"; }, 1200);
  });
}

/* ============================================================
   PROFILE PAGE
   ============================================================ */
function initProfilePage() {
  const session = getSession();
  if (!session) { window.location.href = "login.html"; return; }

  const namaEl = document.getElementById("pfNama");
  const emailEl = document.getElementById("pfEmail");
  if (namaEl) namaEl.value = session.nama;
  if (emailEl) emailEl.value = session.email;

  const saveBtn = document.getElementById("pfSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const newNama = namaEl?.value.trim();
      if (!newNama) { showToast("⚠️ Nama tidak boleh kosong."); return; }
      session.nama = newNama;
      setSession(session);
      const users = getUsers();
      const idx = users.findIndex(u => u.id === session.id);
      if (idx > -1) { users[idx].nama = newNama; saveUsers(users); }
      showToast("✅ Profil berhasil disimpan.");
    });
  }

  // order history in profile
  const orderList = document.getElementById("pfOrderList");
  if (orderList) {
    const orders = getAllOrders().filter(o => o.userId === session.id);
    if (!orders.length) {
      orderList.innerHTML = "<p style='color:var(--text-light)'>Belum ada pesanan.</p>";
    } else {
      orderList.innerHTML = orders.map(o => `
        <div class="pf-order-card">
          <div><strong>#${o.orderNum}</strong> &nbsp;·&nbsp; ${fmtDate(o.createdAt)}</div>
          <div>Total: <strong>${formatPrice(o.total)}</strong> &nbsp;·&nbsp; <span class="pf-status">${o.status || "Diproses"}</span></div>
          <div style="font-size:0.83rem;color:var(--text-light)">${o.items.map(i=>i.name+" x"+i.qty).join(", ")}</div>
        </div>`).join("");
    }
  }

  // menu switching
  document.querySelectorAll(".pf-menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pf-menu-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".pf-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.panel);
      if (target) target.classList.add("active");
    });
  });
}

/* ============================================================
   CHECKOUT PAGE
   ============================================================ */
async function initCheckoutPage() {
  await loadState();
  const session = getSession();
  const cartItemsEl = document.getElementById("coCartItems");
  const subtotalEl = document.getElementById("coSubtotal");
  const discountEl = document.getElementById("coDiscount");
  const ongkirEl = document.getElementById("coOngkir");
  const totalEl = document.getElementById("coTotal");
  const shippingEl = document.getElementById("coShipping");
  const voucherEl = document.getElementById("coVoucher");
  const paymentEl = document.getElementById("coPayment");
  const namaEl = document.getElementById("coNama");
  const phoneEl = document.getElementById("coPhone");
  const alamatEl = document.getElementById("coAlamat");
  const submitBtn = document.getElementById("coSubmitBtn");
  const errorEl = document.getElementById("coError");
  const qrisContainer = document.getElementById('qrisContainer');

  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<p style='color:var(--text-light)'>Keranjang kosong.</p>";
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  // Pre-fill from session
  if (session) {
    if (namaEl) namaEl.value = session.nama || "";
  }

  function recompute() {
    const summary = getCartSummary();
    const shipping = Number(shippingEl?.value || 0);
    const voucherCode = voucherEl?.value.trim().toUpperCase() || (appliedVoucher ? appliedVoucher.code : "");
    let discount = summary.discount;
    if (voucherCode === "LIFA10" && summary.totalItems >= 2) {
      discount = Math.min(summary.subtotal * 0.1, 50000);
    }
    const total = summary.subtotal - discount + shipping;
    if (subtotalEl) subtotalEl.textContent = formatPrice(summary.subtotal);
    if (discountEl) discountEl.textContent = "-" + formatPrice(discount);
    if (ongkirEl) ongkirEl.textContent = shipping === 0 ? "GRATIS" : formatPrice(shipping);
    if (totalEl) totalEl.textContent = formatPrice(Math.max(0, total));
  }

  // render cart items
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="co-item">
      <span class="co-emoji">${item.emoji}</span>
      <div class="co-item-info">
        <div class="co-item-name">${item.name} <span style="color:var(--text-light)">x${item.qty}</span></div>
        <div class="co-item-price">${formatPrice(item.price * item.qty)}</div>
      </div>
    </div>`).join("");

  window.__checkoutRecompute = recompute;
  recompute();
  if (shippingEl) shippingEl.addEventListener("change", recompute);
  if (voucherEl) voucherEl.addEventListener("input", recompute);

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const nama = namaEl?.value.trim();
      const phone = phoneEl?.value.trim();
      const alamat = alamatEl?.value.trim();
      const payment = paymentEl?.value || "Transfer Bank";
      if (!nama || !phone || !alamat) {
        if (errorEl) errorEl.textContent = "Lengkapi nama, nomor telepon, dan alamat.";
        return;
      }
      if (errorEl) errorEl.textContent = "";

      const summary = getCartSummary();
      const shipping = Number(shippingEl?.value || 0);
      const voucherCode = voucherEl?.value.trim().toUpperCase() || (appliedVoucher ? appliedVoucher.code : "");
      let discount = summary.discount;
      if (voucherCode === "LIFA10" && summary.totalItems >= 2) {
        discount = Math.min(summary.subtotal * 0.1, 50000);
      }
      const total = Math.max(0, summary.subtotal - discount + shipping);
      const orderNum = "LF" + Date.now().toString().slice(-6);
      const now = new Date();

      const order = {
        orderNum,
        userId: session?.id || null,
        createdAt: now.toISOString(),
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji || '💐' })),
        subtotal: summary.subtotal,
        discount,
        shipping,
        total,
        payment,
        nama,
        phone,
        alamat,
        status: "Diproses"
      };

      // update stock
      cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) product.stock = Math.max(0, Number(product.stock || 0) - Number(item.qty));
      });

      const allOrders = getAllOrders();
      allOrders.unshift(order);
      saveAllOrders(allOrders);
      saveLastOrder(order);
      saveState();

      // WA
      const itemsText = cart.map(i => `- ${i.name} x${i.qty} (${formatPrice(i.price * i.qty)})`).join("\n");
      const shippingLabel = shipping === 0 ? "Reguler (GRATIS)" : shipping === 10000 ? "Express (Rp 10.000)" : "Same Day (Rp 20.000)";
      const waMsg = encodeURIComponent(`🌸 Halo Lifa Flora!\n\n*Pesanan Baru* #${orderNum}\n\n🛍️ Produk:\n${itemsText}\n\n💰 Subtotal: ${formatPrice(summary.subtotal)}\n🎟️ Diskon: -${formatPrice(discount)}\n🚗 Ongkir: ${formatPrice(shipping)}\n*Total: ${formatPrice(total)}*\n\n💳 Pembayaran: ${payment}\n🚚 Pengiriman: ${shippingLabel}\n\n👤 Nama: ${nama}\n📱 Telepon: ${phone}\n📍 Alamat: ${alamat}\n\nMohon konfirmasi pesanan ini ya! 🌷`);
      window.open(`https://api.whatsapp.com/send?phone=6287710793723&text=${waMsg}`, "_blank");

      cart = [];
      appliedVoucher = null;
      // Hapus cart dari localStorage setelah checkout
      localStorage.removeItem(STORAGE_CART_PERSIST_KEY);
      window.location.href = "order_success.html";
    });
  }
}

/* ============================================================
   ORDER SUCCESS PAGE
   ============================================================ */
function initOrderSuccessPage() {
  const order = getLastOrder();
  const idEl = document.getElementById("osOrderNum");
  const totalEl = document.getElementById("osTotal");
  const statusEl = document.getElementById("osStatus");
  if (idEl) idEl.textContent = order ? "#" + order.orderNum : "-";
  if (totalEl) totalEl.textContent = order ? formatPrice(order.total) : "Rp 0";
  if (statusEl) statusEl.textContent = order ? (order.status || "Diproses") : "-";
}

/* ============================================================
   TRACKING PAGE
   ============================================================ */
function initTrackingPage() {
  const session = getSession();
  const grid    = document.getElementById("trackGrid");
  const emptyEl = document.getElementById("trackEmpty");
  if (!grid) return;

  const STEPS = ["Diproses", "Dikirim", "Selesai"];

  const statusNext  = s => s === "Diproses" ? "Dikirim" : s === "Dikirim" ? "Selesai" : "Selesai";
  const statusColor = s => s === "Selesai" ? "#6DA58A" : s === "Dikirim" ? "#8B5CF6" : "#E8758F";
  const statusBg    = s => s === "Selesai" ? "#E8F5EE" : s === "Dikirim" ? "#EDE9FE" : "#FDE8EE";

  function buildTimeline(status) {
    const current = STEPS.indexOf(status);
    let html = '<div class="track-timeline">';
    STEPS.forEach((step, i) => {
      const isDone   = i < current;
      const isActive = i === current;
      const dotClass = isDone ? "done" : isActive ? "active" : "";
      const lblClass = isDone || isActive ? (isDone ? "done" : "active") : "";
      html += `<div class="track-step">
        <div class="track-step-dot ${dotClass}">${isDone ? "✓" : i + 1}</div>
        <div class="track-step-label ${lblClass}">${step}</div>
      </div>`;
      if (i < STEPS.length - 1) {
        html += `<div class="track-line ${isDone ? "done" : ""}"></div>`;
      }
    });
    html += '</div>';
    return html;
  }

  function render() {
    let allOrd   = getAllOrders();
    let filtered = session ? allOrd.filter(o => o.userId === session.id) : allOrd;

    if (!filtered.length) {
      if (emptyEl) emptyEl.style.display = "block";
      grid.innerHTML = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    grid.innerHTML = filtered.map(o => {
      const status    = o.status || "Diproses";
      const canUpdate = status !== "Selesai";
      const nextLabel = statusNext(status);
      const itemsText = o.items.map(i => `${i.emoji || "💐"} ${i.name} x${i.qty}`).join(" · ");

      return `<div class="track-card">
        <div class="track-header">
          <span class="track-num">#${o.orderNum}</span>
          <span class="track-status" style="background:${statusBg(status)};color:${statusColor(status)}">${status}</span>
        </div>
        <div class="track-date">📅 ${fmtDate(o.createdAt)}</div>
        ${buildTimeline(status)}
        <div class="track-items">${itemsText}</div>
        <div class="track-total">Total: <strong>${formatPrice(o.total)}</strong></div>
        <button class="track-update-btn" data-id="${o.orderNum}" ${canUpdate ? "" : "disabled"}>
          ${canUpdate ? "Update → " + nextLabel : "✓ Pesanan Selesai"}
        </button>
      </div>`;
    }).join("");

    grid.querySelectorAll(".track-update-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id      = btn.dataset.id;
        const allOrd2 = getAllOrders();
        const idx     = allOrd2.findIndex(o => o.orderNum === id);
        if (idx > -1) {
          allOrd2[idx].status = statusNext(allOrd2[idx].status || "Diproses");
          saveAllOrders(allOrd2);
          const lastOrd = getLastOrder();
          if (lastOrd && lastOrd.orderNum === id) saveLastOrder(allOrd2[idx]);
          render();
        }
      });
    });
  }

  render();
}

/* ============================================================
   PAGE ROUTER — called on each page
   ============================================================ */
function initPageRouter() {
  const path = location.pathname.split("/").pop() || "index.html";
  updateNavAuth();
  if (path === "login.html") initLoginPage();
  if (path === "register.html") initRegisterPage();
  if (path === "profile.html") initProfilePage();
  if (path === "checkout.html") initCheckoutPage();
  if (path === "order_success.html") initOrderSuccessPage();
  if (path === "tracking.html") initTrackingPage();
}

function submitContact() {
  const name  = document.getElementById("contactName").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const msg   = document.getElementById("contactMsg").value.trim();
  if (!name || !phone || !msg) { showToast("❗ Semua kolom wajib diisi!"); return; }
  const waMessage = encodeURIComponent(`Halo Lifa Flora! 🌸\n\nNama  : ${name}\nHP    : ${phone}\nPesan : ${msg}`);
  window.open(`https://api.whatsapp.com/send?phone=6287710793723&text=${waMessage}`, "_blank");
  document.getElementById("contactName").value = "";
  document.getElementById("contactPhone").value = "";
  document.getElementById("contactMsg").value = "";
  showToast("✅ Mengarahkan ke WhatsApp...");
}

if (window.lucide && typeof window.lucide.createIcons === 'function') {
  window.lucide.createIcons();
}
initApp();
updateNavAuth();
/* ============================================================
   CS WIDGET — WhatsApp Live Chat
   ============================================================ */
function initCSWidget() {
  const WA_NUMBER = "6287710793723";
  const WA_DEFAULT = "Halo Lifa Flora! 🌸 Saya mau tanya-tanya dulu.";

  // Buat elemen widget
  const widget = document.createElement("div");
  widget.className = "cs-widget";
  widget.id = "csWidget";
  widget.innerHTML = `
    <!-- Bubble popup -->
    <div class="cs-bubble" id="csBubble">
      <div class="cs-bubble-header">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.2rem;">🌸</span>
          <div>
            <div class="cs-bubble-title">Lifa Flora CS</div>
            <div style="font-size:0.72rem;color:#6DA58A;font-weight:500;">● Online sekarang</div>
          </div>
        </div>
        <button class="cs-bubble-close" onclick="toggleCS()" title="Tutup">✕</button>
      </div>
      <div class="cs-bubble-msg">
        Halo! 👋 Ada yang bisa kami bantu? Ketik pesanmu dan kami akan segera balas via WhatsApp.
      </div>
      <textarea class="cs-bubble-input" id="csInput" placeholder="Tulis pesanmu di sini...">${WA_DEFAULT}</textarea>
      <button class="cs-bubble-send" onclick="sendCS()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.144 1.547 5.878L.057 23.504a.5.5 0 0 0 .614.596l5.701-1.476A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.001-1.368l-.36-.214-3.713.96.988-3.607-.236-.372A9.785 9.785 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
        Chat via WhatsApp
      </button>
      <div class="cs-bubble-note">Biasanya balas dalam beberapa menit</div>
    </div>

    <!-- Tombol utama -->
    <button class="cs-btn" onclick="toggleCS()" title="Chat CS">
      <span class="cs-label">Hubungi CS</span>
      <div class="cs-notif" id="csNotif"></div>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.563 4.144 1.547 5.878L.057 23.504a.5.5 0 0 0 .614.596l5.701-1.476A11.938 11.938 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.001-1.368l-.36-.214-3.713.96.988-3.607-.236-.372A9.785 9.785 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
      </svg>
    </button>
  `;

  document.body.appendChild(widget);

  // Sembunyikan notif dot setelah dibuka pertama kali
  const seen = sessionStorage.getItem("csWidgetSeen");
  if (seen) {
    const notif = document.getElementById("csNotif");
    if (notif) notif.style.display = "none";
  }
}

function toggleCS() {
  const bubble = document.getElementById("csBubble");
  const notif  = document.getElementById("csNotif");
  if (!bubble) return;
  bubble.classList.toggle("open");
  if (bubble.classList.contains("open")) {
    sessionStorage.setItem("csWidgetSeen", "1");
    if (notif) notif.style.display = "none";
    document.getElementById("csInput")?.focus();
  }
}

function sendCS() {
  const msg = document.getElementById("csInput")?.value.trim();
  if (!msg) return;
  const url = `https://api.whatsapp.com/send?phone=6287710793723&text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  toggleCS();
}

/* ============================================================
   RATING & ULASAN PRODUK
   ============================================================ */

/* Format angka terjual ala marketplace: 1200 -> 1,2rb */
function formatSoldCount(n) {
  const num = Number(n) || 0;
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(".0", "").replace(".", ",") + "rb";
  }
  return String(num);
}

const STORAGE_REVIEWS_KEY = "lifaFloraReviews";

function getReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_REVIEWS_KEY);
    if (raw === null) {
      // Belum pernah ada data ulasan tersimpan -> isi dengan data awal (seed)
      saveReviews(defaultReviews);
      return defaultReviews;
    }
    return JSON.parse(raw) || {};
  } catch { return {}; }
}

function saveReviews(r) { localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(r)); }

function getProductReviews(productId) {
  return (getReviews()[productId] || []);
}

function getProductRating(productId) {
  const reviews = getProductReviews(productId);
  if (!reviews.length) return { avg: 0, count: 0 };
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return { avg: Math.round(avg * 10) / 10, count: reviews.length };
}

function renderStars(rating, size = "sm") {
  const filled = Math.round(rating);
  return [1,2,3,4,5].map(i =>
    `<span class="${i <= filled ? "filled" : ""}">${i <= filled ? "★" : "☆"}</span>`
  ).join("");
}

function renderDistribBars(reviews) {
  let html = "";
  for (let s = 5; s >= 1; s--) {
    const count = reviews.filter(r => r.rating === s).length;
    const pct   = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    html += `<div class="review-bar-row">
      <div class="review-bar-label">${s}</div>
      <div class="review-bar-track"><div class="review-bar-fill" style="width:${pct}%"></div></div>
      <div class="review-bar-count">${count}</div>
    </div>`;
  }
  return html;
}

/* Inject rating ke kartu produk */
function injectRatingToCards() {
  document.querySelectorAll(".product-card").forEach(card => {
    const btn = card.querySelector(".add-cart-btn");
    if (!btn) return;
    const match = btn.getAttribute("onclick")?.match(/addToCart\((\d+)\)/);
    if (!match) return;
    const productId = Number(match[1]);
    const { avg, count } = getProductRating(productId);
    const soldData = products.find(p => p.id === productId);
    const soldLabel = formatSoldCount(soldData?.sold || 0);

    // Hapus rating lama jika ada
    card.querySelector(".product-rating")?.remove();

    const ratingEl = document.createElement("div");
    ratingEl.className = "product-rating";
    ratingEl.innerHTML = `
      <div class="product-stars">${renderStars(avg)}</div>
      ${avg > 0 ? `<span class="product-rating-avg">${avg}</span>` : ""}
      <span class="product-rating-count">(${count} ulasan)</span>
      <button class="review-btn" onclick="openReviewModal(${productId})">Lihat & Beri Ulasan</button>
      <span class="product-sold-count">Terjual ${soldLabel}</span>`;

    // Sisipkan sebelum product-desc
    const desc = card.querySelector(".product-desc");
    if (desc) desc.before(ratingEl);
  });
}

/* Buka modal ulasan */
let _reviewProductId = null;
let _selectedStar    = 0;

function openReviewModal(productId) {
  _reviewProductId = productId;
  _selectedStar    = 0;

  const product = products.find(p => p.id === productId);
  const reviews = getProductReviews(productId);
  const { avg, count } = getProductRating(productId);
  const session = getSession ? getSession() : null;

  // Buat modal jika belum ada
  let overlay = document.getElementById("reviewModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "review-modal-overlay";
    overlay.id = "reviewModalOverlay";
    overlay.innerHTML = `<div class="review-modal" id="reviewModal"></div>`;
    overlay.addEventListener("click", e => { if (e.target === overlay) closeReviewModal(); });
    document.body.appendChild(overlay);
  }

  const modal = document.getElementById("reviewModal");

  // Render ulasan list
  const reviewList = reviews.length
    ? reviews.slice().reverse().map(r => `
        <div class="review-item">
          <div class="review-item-header">
            <span class="review-item-name">👤 ${r.name}</span>
            <span class="review-item-date">${new Date(r.createdAt).toLocaleDateString("id-ID")}</span>
          </div>
          <div class="review-item-stars">${renderStars(r.rating)}</div>
          <div class="review-item-text">${r.text || "<em style='color:var(--text-light)'>Tidak ada komentar.</em>"}</div>
        </div>`).join("")
    : `<div class="review-empty">🌿 Belum ada ulasan. Jadilah yang pertama!</div>`;

  modal.innerHTML = `
    <div class="review-modal-header">
      <div>
        <div class="review-modal-title">${product?.emoji || "💐"} ${product?.name || "Produk"}</div>
        <div style="font-size:0.8rem;color:var(--text-light)">Rating & Ulasan Pembeli</div>
      </div>
      <button class="review-modal-close" onclick="closeReviewModal()">✕</button>
    </div>

    <!-- Summary -->
    <div class="review-summary">
      <div>
        <div class="review-summary-score">${avg || "—"}</div>
        <div class="review-summary-stars">${renderStars(avg)}</div>
        <div class="review-summary-count">${count} ulasan</div>
      </div>
      <div class="review-bars">${renderDistribBars(reviews)}</div>
    </div>

    <!-- List ulasan -->
    <div class="review-list">${reviewList}</div>

    <!-- Form tulis ulasan -->
    <div class="review-form-title">✍️ Tulis Ulasanmu</div>
    <div class="review-star-picker" id="starPicker">
      ${[1,2,3,4,5].map(i => `<span data-star="${i}" onclick="selectStar(${i})">☆</span>`).join("")}
    </div>
    <input class="review-form-name" id="reviewName" placeholder="Nama kamu..."
      value="${session?.nama || ""}" ${session ? "readonly" : ""} />
    <textarea class="review-form-text" id="reviewText" placeholder="Ceritakan pengalamanmu dengan produk ini..."></textarea>
    <button class="review-submit-btn" onclick="submitReview()">Kirim Ulasan 🌸</button>
    ${!session ? `<p class="review-login-note"><a href="login.html">Login</a> agar nama otomatis terisi.</p>` : ""}
  `;

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReviewModal() {
  document.getElementById("reviewModalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

function selectStar(star) {
  _selectedStar = star;
  document.querySelectorAll("#starPicker span").forEach((el, i) => {
    el.textContent = i < star ? "★" : "☆";
    el.classList.toggle("selected", i < star);
    el.style.color = i < star ? "#F59E0B" : "#D1D1D1";
  });
}

function submitReview() {
  const session = getSession ? getSession() : null;
  const name    = document.getElementById("reviewName")?.value.trim();
  const text    = document.getElementById("reviewText")?.value.trim();

  if (!_selectedStar) { showToast("⭐ Pilih bintang dulu!"); return; }
  if (!name)           { showToast("📝 Masukkan namamu dulu!"); return; }

  const review = {
    id: "rv_" + Date.now(),
    productId: _reviewProductId,
    userId: session?.id || null,
    name,
    rating: _selectedStar,
    text,
    createdAt: new Date().toISOString()
  };

  const allReviews = getReviews();
  if (!allReviews[_reviewProductId]) allReviews[_reviewProductId] = [];
  allReviews[_reviewProductId].unshift(review);
  saveReviews(allReviews);

  showToast("✅ Ulasan berhasil dikirim! Terima kasih 🌸");
  closeReviewModal();

  // Refresh rating di kartu
  setTimeout(() => {
    injectRatingToCards();
    // Buka ulang modal untuk lihat ulasan baru
    openReviewModal(_reviewProductId);
  }, 300);
}

function copyTextToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
    return true;
  }
  const tempInput = document.createElement("input");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  return true;
}

function copyPaymentNumber() {
  const value = document.getElementById("paymentNumber")?.textContent?.trim();
  if (!value || value === "-") {
    showToast("⚠️ Belum ada nomor pembayaran yang dipilih.");
    return;
  }
  copyTextToClipboard(value);
  showToast("📋 Nomor pembayaran berhasil disalin.");
}

function copySelNum() {
  const value = document.getElementById("paySelNum")?.textContent?.trim();
  if (!value || value === "-") {
    showToast("⚠️ Belum ada nomor rekening yang dipilih.");
    return;
  }
  copyTextToClipboard(value);
  showToast("📋 Nomor rekening berhasil disalin.");
}

/* ---- Expose fungsi ke window supaya bisa dipanggil dari onclick HTML ---- */
window.addToCart = addToCart;
window.applyVoucher = applyVoucher;
window.backToProducts = backToProducts;
window.clearCart = clearCart;
window.copyPaymentNumber = copyPaymentNumber;
window.copySelNum = copySelNum;
window.copyVoucherCode = copyVoucherCode;
window.filterProducts = filterProducts;
window.goToCheckout = goToCheckout;
window.logoutUser = logoutUser;
window.navigateTo = navigateTo;
window.resetPayCategory = resetPayCategory;
window.selectBank = selectBank;
window.selectPayCategory = selectPayCategory;
window.submitContact = submitContact;
window.submitProductSearch = submitProductSearch;
window.toggleCart = toggleCart;
window.toggleMenu = toggleMenu;
window.showProductDetail = showProductDetail;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.selectStar = selectStar;
window.submitReview = submitReview;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.placeOrder = placeOrder;
window.openCategory = openCategory;
window.closeMenu = closeMenu;
window.showToast = showToast;
