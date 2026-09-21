import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { createStore, del, get, set } from 'idb-keyval'
import { isNetworkError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      refetchOnWindowFocus: true,
      retry: (count, error) => isNetworkError(error) && count < 3,
    },
    mutations: {
      retry: false,
    },
  },
})

// The cache lives in IndexedDB on this device only, so the app opens instantly
// and keeps working offline. It is wiped on sign-out.
const store = createStore('nuestro-lugar-cache', 'queries')

export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get<string>(key, store).then((v) => v ?? null),
    setItem: (key, value) => set(key, value, store),
    removeItem: (key) => del(key, store),
  },
  key: 'nl.cache',
  throttleTime: 1500,
})

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 14
export const PERSIST_BUSTER = 'v1'
