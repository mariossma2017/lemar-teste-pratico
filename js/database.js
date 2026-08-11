/**
 * Camada de persistência — IndexedDB (avaliações) + localStorage (configurações simples).
 */

const DB_NAME = 'lemarTestePraticoDB';
const DB_VERSION = 1;
const STORE_AVALIACOES = 'avaliacoes';

let _dbPromise = null;

function dbOpen() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_AVALIACOES)) {
        const store = db.createObjectStore(STORE_AVALIACOES, { keyPath: 'id' });
        store.createIndex('dataTeste', 'candidato.dataTeste', { unique: false });
        store.createIndex('nome', 'candidato.nome', { unique: false });
        store.createIndex('atualizadaEm', 'atualizadaEm', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

async function dbSalvarAvaliacao(avaliacao) {
  avaliacao.atualizadaEm = new Date().toISOString();
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVALIACOES, 'readwrite');
    tx.objectStore(STORE_AVALIACOES).put(avaliacao);
    tx.oncomplete = () => resolve(avaliacao);
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function dbObterAvaliacao(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVALIACOES, 'readonly');
    const req = tx.objectStore(STORE_AVALIACOES).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbListarAvaliacoes() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVALIACOES, 'readonly');
    const req = tx.objectStore(STORE_AVALIACOES).getAll();
    req.onsuccess = () => {
      const lista = req.result || [];
      lista.sort((a, b) => (b.atualizadaEm || '').localeCompare(a.atualizadaEm || ''));
      resolve(lista);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbExcluirAvaliacao(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVALIACOES, 'readwrite');
    tx.objectStore(STORE_AVALIACOES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function dbImportarAvaliacoes(lista) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AVALIACOES, 'readwrite');
    const store = tx.objectStore(STORE_AVALIACOES);
    for (const av of lista) store.put(av);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Configurações simples (avaliador padrão) — localStorage.
const CONFIG_KEY = 'lemarTP_config';

function configObter() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function configSalvar(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
