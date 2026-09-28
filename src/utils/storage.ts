const CREDENTIALS_KEY = 'max-chat.credentials.v1'

export function historyKey(idInstance: string): string {
  return `max-chat.history.v1.${idInstance || 'anonymous'}`
}

export const credentialsStorageKey = CREDENTIALS_KEY

export function loadJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Переполнение квоты или приватный режим браузера.
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Игнорируем.
  }
}
