import type { SupabaseClient } from '@supabase/supabase-js'
import { getCloud, type CloudSettings } from './settings'

/** Built-in connection comes from build-time env vars (public anon key, protected by row-level security). */
export const BUILTIN = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '',
  key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '',
}
export const hasBuiltin = !!(BUILTIN.url && BUILTIN.key)

export function activeConnection(cs: Pick<CloudSettings, 'connection' | 'customUrl' | 'customKey'> = getCloud()) {
  if (cs.connection === 'builtin') return hasBuiltin ? BUILTIN : null
  const url = cs.customUrl.trim()
  const key = cs.customKey.trim()
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && key.length > 20 ? { url, key } : null
}

let cached: { id: string; client: SupabaseClient } | null = null

/** Lazily loads supabase-js so people who never turn sync on download none of it. */
export async function getClient(): Promise<SupabaseClient | null> {
  const conn = activeConnection()
  if (!conn) return null
  const id = conn.url + '|' + conn.key
  if (cached?.id === id) return cached.client
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(conn.url, conn.key, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: 'gt-supabase-auth' },
  })
  cached = { id, client }
  return client
}

export const redirectUrl = () => location.origin + location.pathname
