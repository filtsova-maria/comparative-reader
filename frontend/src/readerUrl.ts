export type ReaderRole = 'source' | 'target';

export interface ReaderDocumentUrlState {
    id: string;
    anchor: number;
    search: string;
}

export interface ReaderUrlState {
    source: ReaderDocumentUrlState;
    target: ReaderDocumentUrlState;
}

const READER_URL_KEYS: Record<
    ReaderRole,
    { id: string; anchor: string; search: string }
> = {
    source: { id: 's', anchor: 'sa', search: 'sq' },
    target: { id: 't', anchor: 'ta', search: 'tq' },
};

export function parseDocumentAnchor(value: string | null): number {
    if (!value || !/^\d+$/.test(value)) {
        return 0;
    }

    const anchor = Number(value);
    return Number.isSafeInteger(anchor) ? anchor : 0;
}

export function parseReaderUrl(searchParams: URLSearchParams): ReaderUrlState {
    const parseRole = (role: ReaderRole): ReaderDocumentUrlState => {
        const keys = READER_URL_KEYS[role];
        return {
            id: searchParams.get(keys.id)?.trim() ?? '',
            anchor: parseDocumentAnchor(searchParams.get(keys.anchor)),
            search: searchParams.get(keys.search) ?? '',
        };
    };

    return { source: parseRole('source'), target: parseRole('target') };
}

export function buildBrowsePath(role: ReaderRole): string {
    return `/pick/${role}`;
}

export function buildReaderSearchParams(
    current: URLSearchParams,
    role: ReaderRole,
    document: ReaderDocumentUrlState,
): URLSearchParams {
    const next = new URLSearchParams(current);
    const keys = READER_URL_KEYS[role];
    next.set(keys.id, document.id);
    next.set(keys.anchor, String(document.anchor));
    if (document.search.trim()) {
        next.set(keys.search, document.search);
    } else {
        next.delete(keys.search);
    }
    if (role === 'source') {
        next.delete('sel');
    }
    return next;
}

export function withUpdatedReaderAnchor(
    current: URLSearchParams,
    role: ReaderRole,
    anchor: number,
): URLSearchParams | null {
    const key = READER_URL_KEYS[role].anchor;
    const next = new URLSearchParams(current);
    const value = String(anchor);
    if (next.get(key) === value) {
        return null;
    }

    next.set(key, value);
    return next;
}

export function withUpdatedReaderSearch(
    current: URLSearchParams,
    role: ReaderRole,
    search: string,
): URLSearchParams | null {
    const key = READER_URL_KEYS[role].search;
    const currentValue = current.get(key);
    if (currentValue === search || (!currentValue && !search.trim())) {
        return null;
    }

    const next = new URLSearchParams(current);
    if (search.trim()) {
        next.set(key, search);
    } else {
        next.delete(key);
    }
    return next;
}
