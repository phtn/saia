/** Recorded audio blobs, keyed by clip id. Too large for localStorage, so they live in IndexedDB. */
const DB_NAME = 'saia-notes'
const STORE = 'clips'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const request = action(database.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const putClipAudio = (id: string, blob: Blob) => run('readwrite', (store) => store.put(blob, id)).then(() => undefined)

export const getClipAudio = (id: string) => run<Blob | undefined>('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>)

export const deleteClipAudio = (id: string) => run('readwrite', (store) => store.delete(id)).then(() => undefined)
