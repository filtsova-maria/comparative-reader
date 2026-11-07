import type { CharRange, UrlPatch, WorkspaceData } from './types'

/**
 * Converts a character range to a string representation.
 */
const rangeToString = (r: CharRange): string => `${r.start}-${r.end}`
/**
 * Converts a string representation of a character range to a CharRange object. Returns null if the string is not a valid range.
 */
const stringToRange = (s: string | null): CharRange | null => {
    const m = s && s.match(/^(\d+)-(\d+)$/)
    return m && Number(m[1]) < Number(m[2])
        ? { start: Number(m[1]), end: Number(m[2]) }
        : null
}
/**
 * Helper function to parse integers. Returns null if the string is not a valid integer.
 */
const int = (v: string | null) =>
    v !== null && /^\d+$/.test(v) ? Number(v) : null

/**
 *
 * @param w Workspace state.
 * @returns Url parameter string that encodes the workspace state.
 */
export const workspaceToSearch = (w: WorkspaceData): string => {
    const p = new URLSearchParams()
    if (w.source) {
        p.set('s', w.source.docId)
        p.set('sa', String(w.source.anchor))
        if (w.selection?.docId === w.source.docId) {
            p.set('sel', rangeToString(w.selection.range))
        }
    }
    const tab =
        w.rightPane === 'target'
            ? w.tabs.find((t) => t.docId === w.activeTabDocId)
            : undefined
    if (tab !== undefined) {
        p.set('t', tab.docId)
        p.set('ta', String(tab.anchor))
    }
    return p.toString()
}

/**
 *
 * @param search Url query string.
 * @returns Parameters to update workspace state with. Only includes parameters that are present in the query string.
 */
export const searchToPatch = (search: string): UrlPatch => {
    const p = new URLSearchParams(search)
    const out: UrlPatch = {}
    const s = p.get('s')
    if (s) {
        out.source = { docId: s, anchor: int(p.get('sa')) ?? 0 }
        const sel = stringToRange(p.get('sel'))
        if (sel) {
            out.selection = { docId: s, range: sel }
        }
    }
    const t = p.get('t')
    if (t) {
        out.target = { docId: t, anchor: int(p.get('ta')) ?? 0 }
    }
    return out
}
