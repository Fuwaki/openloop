const DB_NAME = 'pyodide-package-cache'
const DB_VERSION = 1
const STORE_NAME = 'packages'

// 只缓存这些大文件扩展名
const CACHEABLE_EXTS = ['.wasm', '.whl', '.zip']

function isCacheable(url: string): boolean {
  return CACHEABLE_EXTS.some((ext) => url.endsWith(ext))
}

function getContentType(url: string): string {
  if (url.endsWith('.wasm')) return 'application/wasm'
  if (url.endsWith('.whl')) return 'application/zip'
  if (url.endsWith('.zip')) return 'application/zip'
  return 'application/octet-stream'
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'url' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCached(db: IDBDatabase, url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(url)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function putCached(db: IDBDatabase, url: string, data: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ url, data, timestamp: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export interface CacheEntry {
  url: string
  size: number
}

export async function getCachedEntries(): Promise<CacheEntry[]> {
  if (typeof indexedDB === 'undefined') return []
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const entries: CacheEntry[] = (req.result as Array<{ url: string; data: ArrayBuffer }>).map(
        (r) => ({
          url: r.url,
          size: r.data.byteLength,
        }),
      )
      resolve(entries)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getCacheSize(): Promise<number> {
  const entries = await getCachedEntries()
  return entries.reduce((sum, e) => sum + e.size, 0)
}

export async function clearCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Database delete blocked'))
  })
}

let installed = false

/**
 * 拦截 window.fetch，对 pyodide CDN 的大文件请求做 IndexedDB 缓存。
 * 重复调用安全（只安装一次）。
 */
export function installFetchCache(): void {
  if (installed) return
  if (typeof indexedDB === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // 只拦截 pyodide CDN 的可缓存文件
    if (!url.includes('cdn.jsdelivr.net/pyodide') || !isCacheable(url)) {
      return originalFetch(input, init)
    }

    try {
      const db = await openDB()
      const cached = await getCached(db, url)
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': getContentType(url), 'X-Cache': 'IDB-HIT' },
        })
      }

      const response = await originalFetch(input, init)
      if (response.ok) {
        const clone = response.clone()
        clone.arrayBuffer().then((buf) => putCached(db, url, buf))
      }
      return response
    } catch {
      // 缓存出错时降级到直接 fetch
      return originalFetch(input, init)
    }
  }
}
