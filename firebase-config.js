/* ============================================================
   firebase-config.js — Konfigurasi Firebase Lifa Flora
   Handles: sinkronisasi produk antara admin dan halaman utama
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANUAN6InJBphGVg7_EIfcdvF8peLLEYzM",
  authDomain: "lifa-flora.firebaseapp.com",
  projectId: "lifa-flora",
  storageBucket: "lifa-flora.firebasestorage.app",
  messagingSenderId: "775866613296",
  appId: "1:775866613296:web:a00a619afc378cc28f77f5",
  measurementId: "G-7JHZ77LLEX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---- Ambil semua produk dari Firestore ---- */
async function getProductsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    if (snapshot.empty) return null;
    const prods = [];
    snapshot.forEach(d => prods.push({ id: d.data().id, ...d.data() }));
    prods.sort((a, b) => a.id - b.id);
    return prods;
  } catch (e) {
    console.warn("Firestore read error:", e);
    return null;
  }
}

/* ---- Simpan semua produk ke Firestore ---- */
async function saveProductsToFirestore(products) {
  try {
    for (const p of products) {
      await setDoc(doc(db, "products", String(p.id)), p);
    }
    return true;
  } catch (e) {
    console.warn("Firestore write error:", e);
    return false;
  }
}

/* ---- Simpan satu produk ke Firestore ---- */
async function saveOneProductToFirestore(product) {
  try {
    await setDoc(doc(db, "products", String(product.id)), product);
    return true;
  } catch (e) {
    console.warn("Firestore write error:", e);
    return false;
  }
}

/* ---- Dengarkan perubahan produk secara realtime ---- */
function listenProducts(callback) {
  return onSnapshot(collection(db, "products"), (snapshot) => {
    const prods = [];
    snapshot.forEach(d => prods.push(d.data()));
    prods.sort((a, b) => a.id - b.id);
    callback(prods);
  });
}

export {
  db,
  getProductsFromFirestore,
  saveProductsToFirestore,
  saveOneProductToFirestore,
  listenProducts
};
