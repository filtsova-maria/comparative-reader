import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentLayout } from './documentModel';

interface DocumentPosition {
    tape: number;
    seconds: number;
}

interface ActiveWord {
    layout: DocumentLayout;
    idPrefix: string;
    index: number;
}

interface UseDocumentPositionProps {
    layout: DocumentLayout;
    anchor: number;
    idPrefix: string;
    onAnchorChange: (anchor: number) => void;
}

const ANCHOR_SYNC_DEBOUNCE_MS = 200;

export function useDocumentPosition({
    layout,
    anchor,
    idPrefix,
    onAnchorChange,
}: UseDocumentPositionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wordElementsRef = useRef<HTMLElement[]>([]);
    const activeWordRef = useRef<ActiveWord | null>(null);
    const pendingAnchorRef = useRef<number | null>(null);
    const anchorSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const [currentPosition, setCurrentPosition] =
        useState<DocumentPosition | null>(() => {
            const firstWord = layout.words[0];
            return firstWord
                ? { tape: firstWord.tape, seconds: firstWord.seconds }
                : null;
        });

    const cancelPendingAnchorSync = useCallback(() => {
        if (anchorSyncTimeoutRef.current !== null) {
            clearTimeout(anchorSyncTimeoutRef.current);
            anchorSyncTimeoutRef.current = null;
        }
        pendingAnchorRef.current = null;
    }, []);
    const scheduleAnchorSync = useCallback(
        (wordIndex: number) => {
            pendingAnchorRef.current = wordIndex;
            if (anchorSyncTimeoutRef.current !== null) {
                clearTimeout(anchorSyncTimeoutRef.current);
            }
            anchorSyncTimeoutRef.current = setTimeout(() => {
                anchorSyncTimeoutRef.current = null;
                const pendingAnchor = pendingAnchorRef.current;
                pendingAnchorRef.current = null;
                if (pendingAnchor !== null) {
                    onAnchorChange(pendingAnchor);
                }
            }, ANCHOR_SYNC_DEBOUNCE_MS);
        },
        [onAnchorChange],
    );

    const updatePosition = useCallback(
        (syncAnchor = true, deferAnchorSync = false) => {
            const container = containerRef.current;
            const wordElements = wordElementsRef.current;
            if (
                !container ||
                wordElements.length === 0 ||
                wordElements.length !== layout.words.length
            ) {
                return;
            }

            const visibleTop = container.getBoundingClientRect().top;
            let low = 0;
            let high = wordElements.length;

            while (low < high) {
                const middle = Math.floor((low + high) / 2);
                if (
                    wordElements[middle].getBoundingClientRect().bottom <=
                    visibleTop
                ) {
                    low = middle + 1;
                } else {
                    high = middle;
                }
            }

            const wordIndex = Math.min(low, wordElements.length - 1);
            const word = layout.words[wordIndex];
            const activeWord = activeWordRef.current;
            if (
                !activeWord ||
                activeWord.layout !== layout ||
                activeWord.idPrefix !== idPrefix ||
                activeWord.index !== wordIndex
            ) {
                activeWordRef.current = { layout, idPrefix, index: wordIndex };
                if (syncAnchor) {
                    if (deferAnchorSync) {
                        scheduleAnchorSync(wordIndex);
                    } else {
                        cancelPendingAnchorSync();
                        onAnchorChange(wordIndex);
                    }
                }
            }

            setCurrentPosition((current) =>
                current?.tape === word.tape && current.seconds === word.seconds
                    ? current
                    : { tape: word.tape, seconds: word.seconds },
            );
        },
        [
            cancelPendingAnchorSync,
            idPrefix,
            layout,
            onAnchorChange,
            scheduleAnchorSync,
        ],
    );
    const updateCurrentPosition = useCallback(
        () => updatePosition(true, true),
        [updatePosition],
    );

    useEffect(() => cancelPendingAnchorSync, [cancelPendingAnchorSync]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        wordElementsRef.current = Array.from(
            container.querySelectorAll<HTMLElement>('[data-word-index]'),
        );
        if (wordElementsRef.current.length === 0) {
            cancelPendingAnchorSync();
            activeWordRef.current = null;
            setCurrentPosition(null);
            return;
        }

        const word = wordElementsRef.current[anchor];
        const activeWord = activeWordRef.current;
        const alreadyAtAnchor =
            activeWord?.layout === layout &&
            activeWord.idPrefix === idPrefix &&
            activeWord.index === anchor;
        const didScrollToAnchor = Boolean(word && !alreadyAtAnchor);
        if (didScrollToAnchor && word) {
            cancelPendingAnchorSync();
            const wordRect = word.getBoundingClientRect();
            const containerTop = container.getBoundingClientRect().top;
            const wordCenter =
                wordRect.top - containerTop + wordRect.height / 2;
            container.scrollTo({
                top: Math.max(
                    0,
                    container.scrollTop +
                        wordCenter -
                        container.clientHeight / 2,
                ),
            });
        }
        updatePosition(!didScrollToAnchor);
    }, [anchor, cancelPendingAnchorSync, idPrefix, layout, updatePosition]);

    return {
        containerRef,
        currentPosition,
        updateCurrentPosition,
    };
}
