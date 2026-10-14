const DATABASE_NAME = 'tanodbukid-scan-history'
const DATABASE_VERSION = 1
const RECORD_STORE = 'scan-records'
const IMAGE_STORE = 'scan-images'

let databasePromise

function openDatabase() {
    if (!globalThis.indexedDB) return Promise.reject(new Error('This browser does not support saved scan history.'))
    if (databasePromise) return databasePromise

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
        request.onupgradeneeded = () => {
            const database = request.result
            if (!database.objectStoreNames.contains(RECORD_STORE)) {
                const records = database.createObjectStore(RECORD_STORE, { keyPath: 'id' })
                records.createIndex('scannedAt', 'scannedAt')
                records.createIndex('userId', 'userId')
            }
            if (!database.objectStoreNames.contains(IMAGE_STORE)) {
                database.createObjectStore(IMAGE_STORE, { keyPath: 'scanId' })
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => {
            databasePromise = null
            reject(request.error || new Error('Unable to open saved scan history.'))
        }
        request.onblocked = () => {
            databasePromise = null
            reject(new Error('Saved scan history is blocked by another open tab.'))
        }
    })

    return databasePromise
}

export async function saveScanRecord(record, imageBlob = null) {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([RECORD_STORE, IMAGE_STORE], 'readwrite')
        const records = transaction.objectStore(RECORD_STORE)
        const images = transaction.objectStore(IMAGE_STORE)
        const existingRequest = records.get(record.id)
        let created = false

        existingRequest.onsuccess = () => {
            if (existingRequest.result) return
            records.add(record)
            if (imageBlob instanceof Blob) images.put({ scanId: record.id, blob: imageBlob, type: imageBlob.type })
            created = true
        }
        transaction.oncomplete = () => {
            if (created) window.dispatchEvent(new CustomEvent('tanodbukid:scan-history-changed'))
            resolve({ created })
        }
        transaction.onerror = () => reject(transaction.error || new Error('Unable to save this scan.'))
        transaction.onabort = () => reject(transaction.error || new Error('Unable to save this scan.'))
    })
}

export async function listScanRecords(userId = null) {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(RECORD_STORE, 'readonly')
        const request = transaction.objectStore(RECORD_STORE).getAll()
        request.onsuccess = () => {
            const records = userId ? request.result.filter((record) => record.userId === userId) : request.result
            records.sort((left, right) => new Date(right.scannedAt) - new Date(left.scannedAt))
            resolve(records)
        }
        request.onerror = () => reject(request.error || new Error('Unable to read saved scan history.'))
    })
}

export async function getScanImage(scanId) {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(IMAGE_STORE, 'readonly')
        const request = transaction.objectStore(IMAGE_STORE).get(scanId)
        request.onsuccess = () => resolve(request.result?.blob || null)
        request.onerror = () => reject(request.error || new Error('Unable to read the saved scan image.'))
    })
}