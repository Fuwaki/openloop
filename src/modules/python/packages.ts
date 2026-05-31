export interface PackageInfo {
  name: string
  version: string
  depends: string[]
}

const PYODIDE_VERSION = '0.29.4'
const LOCK_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide-lock.json`

let packageIndex: Map<string, PackageInfo> | null = null
let fetchPromise: Promise<void> | null = null

export async function fetchPackageIndex(): Promise<void> {
  if (packageIndex) return
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    const resp = await fetch(LOCK_URL)
    const lock = await resp.json()
    const map = new Map<string, PackageInfo>()
    for (const [name, pkg] of Object.entries(lock.packages as Record<string, PackageInfo>)) {
      map.set(name, pkg)
    }
    packageIndex = map
  })()

  try {
    await fetchPromise
  } catch {
    fetchPromise = null
  }
}

export function searchPackages(query: string, limit = 20): PackageInfo[] {
  if (!packageIndex) return []
  const q = query.trim().toLowerCase()
  if (!q) return []

  const results: PackageInfo[] = []
  for (const [name, pkg] of packageIndex) {
    if (name.includes(q)) {
      results.push(pkg)
      if (results.length >= limit) break
    }
  }
  return results
}

// 常用科学计算/控制相关包
export const RECOMMENDED_PACKAGES = [
  'numpy',
  'scipy',
  'matplotlib',
  'pandas',
  'sympy',
  'pillow',
  'networkx',
]
