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

export function useDocumentPosition({
    layout,
    anchor,
    idPrefix,
    onAnchorChange,
}: UseDocumentPositionProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wordElementsRef = useRef<HTMLElement[]>([]);
    const activeWordRef = useRef<ActiveWord | null>(null);
    const [currentPosition, setCurrentPosition] =
        useState<DocumentPosition | null>(() => {
            const firstWord = layout.words[0];
            return firstWord
                ? { tape: firstWord.tape, seconds: firstWord.seconds }
                : null;
        });

    const updatePosition = useCallback(
        (syncAnchor = true) => {
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
                    onAnchorChange(wordIndex);
                }
            }

            setCurrentPosition((current) =>
                current?.tape === word.tape && current.seconds === word.seconds
                    ? current
                    : { tape: word.tape, seconds: word.seconds },
            );
        },
        [idPrefix, layout, onAnchorChange],
    );
    const updateCurrentPosition = useCallback(
        () => updatePosition(),
        [updatePosition],
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        wordElementsRef.current = Array.from(
            container.querySelectorAll<HTMLElement>('[data-word-index]'),
        );
        if (wordElementsRef.current.length === 0) {
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
    }, [anchor, idPrefix, layout, updatePosition]);

    return {
        containerRef,
        currentPosition,
        updateCurrentPosition,
    };
}
