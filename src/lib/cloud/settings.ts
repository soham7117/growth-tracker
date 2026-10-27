import { createStore } from '../storage'

export interface CloudSettings {
  enabled: boolean // master switch; when false nothing cloud-related loads
  backup: boolean // upload a private backup snapshot
  auto: boolean // automatic sync instead of manual push/pull
  encrypt: boolean // encrypt the backup in the browser with a passphrase
  lastRevision: number | null
  lastHash: string | null
  lastSyncedAt: number | null
  lastUserId: string | null // account this device last synced with (guards against mixing accounts)
}

export const CLOUD_DEFAULTS: CloudSettings = {
  enabled: false,
  backup: true,
  auto: false,
  encrypt: true,
  lastRevision: null,
  lastHash: null,
  lastSyncedAt: null,
  lastUserId: null,
}

const store = createStore<CloudSettings>('gt-cloud', CLOUD_DEFAULTS)

export const getCloud = store.get
export const updateCloud = store.update
export const useCloudSettings = store.use
