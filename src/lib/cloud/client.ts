import type { SupabaseClient } from '@supabase/supabase-js'

/** Built-in connection comes from build-time env vars (public anon key, protected by row-level security). */
export const BUILTIN = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '',
  key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '',
}
export const hasBuiltin = !!(BUILTIN.url && BUILTIN.key)

/** The connection this site was built with, or null when sync isn't configured (the app is then purely local). */
export const activeConnection = () => (hasBuiltin ? BUILTIN : null)

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
