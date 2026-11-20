import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TestimonySearchResponse } from '../api/types';
import { HighlightedText } from './HighlightedText';

interface SearchResultsPopoverProps {
    children: ReactNode;
    hasCurrentSearch: boolean;
    isPending: boolean;
    error: Error | null;
    result: TestimonySearchResponse | null;
    onAnchorChange: (anchor: number) => void;
}

export const SearchResultsPopover = ({
    children,
    hasCurrentSearch,
    isPending,
    error,
    result,
    onAnchorChange,
}: SearchResultsPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const dismissOnOutsidePointer = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !rootRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        const dismissOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);

                const trigger = rootRef.current?.querySelector<HTMLElement>(
                    '[data-search-popover-trigger]',
                );
                if (trigger && document.activeElement === trigger) {
                    trigger.blur();
                }
            }
        };

        document.addEventListener('pointerdown', dismissOnOutsidePointer, true);
        document.addEventListener('keydown', dismissOnEscape, true);
        return () => {
            document.removeEventListener(
                'pointerdown',
                dismissOnOutsidePointer,
                true,
            );
            document.removeEventListener('keydown', dismissOnEscape, true);
        };
    }, [isOpen]);

    return (
        <div
            ref={rootRef}
            className="relative z-20 mb-4"
            onFocusCapture={(event) => {
                if (
                    event.target instanceof HTMLElement &&
                    event.target.matches('[data-search-popover-trigger]')
                ) {
                    setIsOpen(true);
                }
            }}
        >
            {children}
            {isOpen && hasCurrentSearch && (
                <div
                    role="region"
                    aria-label="Search results"
                    className="absolute inset-x-0 top-full z-30 max-h-[60vh] overflow-y-auto rounded-md border border-gray-300 bg-white p-3 shadow-lg"
                >
                    {isPending && (
                        <p role="status" className="m-0">
                            Searching this testimony...
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="m-0 text-red-700">
                            Could not search testimony: {error.message}
                        </p>
                    )}
                    {result && (
                        <>
                            <p role="status" className="mb-2 mt-0">
                                {result.total_sentences} matched sentence
                                {result.total_sentences > 1 && 's'}
                            </p>
                            {result.hits.length === 0 ? (
                                <p className="m-0">No occurrences found.</p>
                            ) : (
                                <ol className="m-0 list-none space-y-1 p-0">
                                    {result.hits.map((hit, index) => (
                                        <li
                                            key={`${hit.idx}-${hit.anchor}-${index}`}
                                        >
                                            <button
                                                type="button"
                                                className="w-full rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    onAnchorChange(hit.anchor);
                                                }}
                                            >
                                                <span className="mb-1 block text-xs text-gray-600">
                                                    Tape {hit.tape} · Sentence{' '}
                                                    {hit.idx + 1}
                                                </span>
                                                <span>
                                                    <HighlightedText
                                                        text={hit.text}
                                                        ranges={hit.ranges}
                                                    />
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
