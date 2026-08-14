import {ref} from 'vue'

const STORAGE_KEY = 'milog.progress.v1'

const solved = ref({})
let hydrated = false

const hydrate = () => {
    if (hydrated || typeof window === 'undefined') return
    hydrated = true
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed && typeof parsed === 'object') solved.value = parsed
    } catch (e) {
        solved.value = {}
    }
}

const persist = () => {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(solved.value))
    } catch (e) {
    }
}

export function useProgress() {
    hydrate()

    const isSolved = (id) => Boolean(id && solved.value[id])

    const markSolved = (id) => {
        if (!id || solved.value[id]) return
        solved.value = {...solved.value, [id]: Date.now()}
        persist()
    }

    const forget = (id) => {
        if (!id || !solved.value[id]) return
        const next = {...solved.value}
        delete next[id]
        solved.value = next
        persist()
    }

    const forgetAll = (ids) => {
        const next = {...solved.value}
        ids.forEach(id => delete next[id])
        solved.value = next
        persist()
    }

    return {solved, isSolved, markSolved, forget, forgetAll}
}
