// js/firebase-config.js - Clean version, only used functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update, get, query, orderByChild, limitToLast, startAfter, endAt } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = { 
  apiKey: "AIzaSyBeUaOyesw9ucpBGumNjrzUp3WfUtXu39w", 
  authDomain: "growthogether.firebaseapp.com", 
  databaseURL: "https://growthogether-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "growthogether", 
  storageBucket: "growthogether.firebasestorage.app", 
  messagingSenderId: "784796645743", 
  appId: "1:784796645743:web:e4eb40810d3051826d909a" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Simple cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let dataCache = null;
let cacheTimestamp = null;

export async function getDataWithCache() {
  const now = Date.now();
  if (dataCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log("Using cached data");
    return dataCache;
  }
  
  console.log("Fetching fresh data from Firebase");
  const snapshot = await get(ref(db, "data/"));
  dataCache = snapshot.val();
  cacheTimestamp = now;
  return dataCache;
}

export function invalidateCache() {
  dataCache = null;
  cacheTimestamp = null;
  console.log("Cache invalidated");
}

export { 
  db, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update, 
  get, 
  query, 
  orderByChild, 
  limitToLast, 
  startAfter, 
  endAt 
};
