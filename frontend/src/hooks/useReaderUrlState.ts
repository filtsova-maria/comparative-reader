import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';

export type ReaderAnchorKey = 'sa' | 'ta';

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

export function useReaderUrlState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;

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

    return {
        sourceId: searchParams.get('s')?.trim() ?? '',
        targetId: searchParams.get('t')?.trim() ?? '',
        sourceAnchor: parseDocumentAnchor(searchParams.get('sa')),
        targetAnchor: parseDocumentAnchor(searchParams.get('ta')),
        updateSourceAnchor,
        updateTargetAnchor,
    };
}
