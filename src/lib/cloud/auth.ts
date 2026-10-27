import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getClient, redirectUrl } from './client'
import { updateCloud, useCloudSettings } from './settings'
import { setPassphrase } from './status'

export type Provider = 'github' | 'google'

/** Starts the OAuth redirect. Email sign-in is intentionally not offered yet (needs a custom SMTP sender). */
export async function signInWithProvider(provider: Provider) {
  const client = await getClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  try {
    sessionStorage.setItem('gt-return', '#/settings')
  } catch {
    /* ignore */
  }
  const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } })
  if (error) throw error
}

export async function signOut() {
  const client = await getClient()
  await client?.auth.signOut()
  // forget this account's sync markers and the in-memory passphrase
  updateCloud({ lastRevision: null, lastHash: null, lastUserId: null })
  setPassphrase('')
}

/** undefined = still loading, null = signed out. Only touches the network when cloud sync is enabled. */
export function useSession() {
  const cs = useCloudSettings()
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!cs.enabled) {
      setSession(null)
      return
    }
    let cancelled = false
    let unsub: (() => void) | undefined
    ;(async () => {
      const client = await getClient()
      if (cancelled) return
      if (!client) return setSession(null)
      const { data } = await client.auth.getSession()
      if (!cancelled) setSession(data.session)
      const sub = client.auth.onAuthStateChange((event, s) => {
        setSession(s)
        if (event === 'SIGNED_IN') {
          try {
            const back = sessionStorage.getItem('gt-return')
            if (back) {
              sessionStorage.removeItem('gt-return')
              if (/^#\/[\w/-]*$/.test(back)) location.hash = back // in-app routes only
            }
          } catch {
            /* ignore */
          }
        }
      })
      unsub = () => sub.data.subscription.unsubscribe()
    })()
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [cs.enabled])

  return session
}
