const KEY = 'ccarf-quiz-v1'

export const emptyProgress = () => ({
  answers: {}, // id -> { last: number[], correct: bool, attempts, wrong, at }
  flags: {}, // id -> true
  sessions: {}, // key -> session
  current: null, // session key last used
})

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    return { ...emptyProgress(), ...JSON.parse(raw) }
  } catch {
    return emptyProgress()
  }
}

export function save(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /* storage unavailable */
  }
}

const SETTINGS_KEY = 'ccarf-settings-v1'
export const defaultSettings = { theme: 'system', glossary: true }

export function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable */
  }
}

export function exportJson(progress) {
  const payload = { app: 'ccarf-quiz', version: 1, exportedAt: new Date().toISOString(), ...progress }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `ccarf-progress-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

// Parse + validate a backup file's text. Returns { progress, exportedAt } or throws a readable Error.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
  if (!isObj(data) || !isObj(data.answers) || !isObj(data.sessions)) {
    throw new Error('That file does not look like a CCAR-F progress backup.')
  }
  const { app, version, exportedAt, ...rest } = data
  const progress = { ...emptyProgress(), ...rest, flags: isObj(rest.flags) ? rest.flags : {} }
  if (progress.current && !progress.sessions[progress.current]) progress.current = null
  return { progress, exportedAt: exportedAt || null }
}

// Seeded RNG helpers so shuffles are stable across reloads
export function hash(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle(arr, seed) {
  const r = rng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
