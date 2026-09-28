import { useCallback, useState } from 'react'

import type { Credentials } from '../api'
import { credentialsStorageKey, loadJSON, removeItem, saveJSON } from '../utils/storage'

export function useSession() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    loadJSON<Credentials>(credentialsStorageKey),
  )

  const signIn = useCallback((next: Credentials) => {
    saveJSON(credentialsStorageKey, next)
    setCredentials(next)
  }, [])

  const signOut = useCallback(() => {
    removeItem(credentialsStorageKey)
    setCredentials(null)
  }, [])

  return { credentials, signIn, signOut }
}
