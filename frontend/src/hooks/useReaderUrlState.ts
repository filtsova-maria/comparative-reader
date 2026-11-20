import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';

export type ReaderAnchorKey = 'sa' | 'ta';
export type ReaderSearchKey = 'sq' | 'tq';

export function parseDocumentAnchor(value: string | null): number {
    if (!value || !/^\d+$/.test(value)) {
        return 0;
    }

    const anchor = Number(value);
    return Number.isSafeInteger(anchor) ? anchor : 0;
}

export function withUpdatedAnchor(
    current: URLSearchParams,
    key: ReaderAnchorKey,
    anchor: number,
): URLSearchParams | null {
    const next = new URLSearchParams(current);
    const value = String(anchor);
    if (next.get(key) === value) {
        return null;
    }

    next.set(key, value);
    return next;
}

export function withUpdatedSearch(
    current: URLSearchParams,
    key: ReaderSearchKey,
    search: string,
): URLSearchParams | null {
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

export function useReaderUrlState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsRef = useRef(searchParams);
    useLayoutEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    const updateAnchor = useCallback(
        (key: ReaderAnchorKey, anchor: number) => {
            const next = withUpdatedAnchor(
                searchParamsRef.current,
                key,
                anchor,
            );
            if (!next) {
                return;
            }

            searchParamsRef.current = next;
            setSearchParams(next, { replace: true });
        },
        [setSearchParams],
    );

    const updateSourceAnchor = useCallback(
        (anchor: number) => updateAnchor('sa', anchor),
        [updateAnchor],
    );
    const updateTargetAnchor = useCallback(
        (anchor: number) => updateAnchor('ta', anchor),
        [updateAnchor],
    );
    const updateSearch = useCallback(
        (key: ReaderSearchKey, search: string) => {
            const next = withUpdatedSearch(
                searchParamsRef.current,
                key,
                search,
            );
            if (!next) {
                return;
            }

            searchParamsRef.current = next;
            setSearchParams(next, { replace: true });
        },
        [setSearchParams],
    );
    const updateSourceSearch = useCallback(
        (search: string) => updateSearch('sq', search),
        [updateSearch],
    );
    const updateTargetSearch = useCallback(
        (search: string) => updateSearch('tq', search),
        [updateSearch],
    );

    return {
        sourceId: searchParams.get('s')?.trim() ?? '',
        targetId: searchParams.get('t')?.trim() ?? '',
        sourceAnchor: parseDocumentAnchor(searchParams.get('sa')),
        targetAnchor: parseDocumentAnchor(searchParams.get('ta')),
        sourceSearch: searchParams.get('sq') ?? '',
        targetSearch: searchParams.get('tq') ?? '',
        updateSourceAnchor,
        updateTargetAnchor,
        updateSourceSearch,
        updateTargetSearch,
    };
}
