// js/firebase-config.js - Optimized with cache
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update, get, query, limitToLast, orderByChild, startAfter, endAt } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let dataCache = null;
let cacheTimestamp = null;

// Function to get data with cache
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

// Function to invalidate cache
export function invalidateCache() {
  dataCache = null;
  cacheTimestamp = null;
  console.log("Cache invalidated");
}

// Function to get paginated plans
export async function getPaginatedPlans(category, pageSize = 10, lastKey = null) {
  let plansRef = ref(db, "data/plans");
  let plansQuery;
  
  if (lastKey) {
    plansQuery = query(
      plansRef,
      orderByChild("cat"),
      startAfter(lastKey),
      limitToLast(pageSize)
    );
  } else {
    plansQuery = query(
      plansRef,
      orderByChild("cat"),
      limitToLast(pageSize)
    );
  }
  
  const snapshot = await get(plansQuery);
  return snapshot.val() || {};
}

// Function to get paginated visions
export async function getPaginatedVisions(pageSize = 10, lastTimestamp = null) {
  let visionsRef = ref(db, "data/visions");
  let visionsQuery;
  
  if (lastTimestamp) {
    visionsQuery = query(
      visionsRef,
      orderByChild("createdAt"),
      endAt(lastTimestamp),
      limitToLast(pageSize)
    );
  } else {
    visionsQuery = query(
      visionsRef,
      orderByChild("createdAt"),
      limitToLast(pageSize)
    );
  }
  
  const snapshot = await get(visionsQuery);
  const visions = snapshot.val() || {};
  
  // Convert to array and sort by createdAt
  const visionsArray = Object.entries(visions).map(([id, v]) => ({ id, ...v }));
  visionsArray.sort((a, b) => b.createdAt - a.createdAt);
  
  return visionsArray;
}

// Function to get paginated finances
export async function getPaginatedFinances(pageSize = 20, lastDate = null) {
  let financesRef = ref(db, "data/finances");
  let financesQuery;
  
  if (lastDate) {
    financesQuery = query(
      financesRef,
      orderByChild("date"),
      endAt(lastDate),
      limitToLast(pageSize)
    );
  } else {
    financesQuery = query(
      financesRef,
      orderByChild("date"),
      limitToLast(pageSize)
    );
  }
  
  const snapshot = await get(financesQuery);
  return snapshot.val() || {};
}

// Debounce utility
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Throttle utility
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export { db, ref, set, push, onValue, remove, update, get, query, limitToLast, orderByChild, startAfter, endAt };
