import { useEffect } from 'react'
import { currentSnapshot } from './backup'
import { syncNow } from './engine'
import { useSession } from './auth'
import { getCloud, useCloudSettings } from './settings'
import { getPassphrase, getStatus } from './status'

let busy = false

/**
 * Automatic sync (only when the user switched it on): pushes local changes shortly after they happen
 * and checks the cloud for newer data every minute. It never overwrites on conflict; it pauses and asks.
 */
export function useAutoSync() {
  const cs = useCloudSettings()
  const session = useSession()
  const active = cs.enabled && cs.auto && cs.backup && !!session

  useEffect(() => {
    if (!active) return
    let lastPoll = 0

    const tick = async () => {
      if (busy || document.hidden || !navigator.onLine) return
      const c = getCloud()
      if (c.encrypt && !getPassphrase()) return
      if (getStatus().phase === 'conflict') return
      busy = true
      try {
        const { hash } = await currentSnapshot()
        const dirty = hash !== c.lastHash
        const duePoll = Date.now() - lastPoll > 60_000
        if (dirty || duePoll) {
          lastPoll = Date.now()
          await syncNow()
        }
      } finally {
        busy = false
      }
    }

    const id = setInterval(tick, 20_000)
    const onVisible = () => !document.hidden && void tick()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    void tick()
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [active])
}
