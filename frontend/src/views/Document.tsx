import { useEffect, useRef } from 'react';
import type { TestimonyData } from '../api/types';

interface DocumentProps {
    data: TestimonyData;
    anchor: number;
    idPrefix: string;
}

export const Document = ({ data, anchor, idPrefix }: DocumentProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentence = document.getElementById(
            `${idPrefix}-sentence-${anchor}`,
        );
        const container = containerRef.current;
        if (sentence && container) {
            const sentenceTop =
                sentence.getBoundingClientRect().top -
                container.getBoundingClientRect().top;
            container.scrollTo({ top: container.scrollTop + sentenceTop });
        }
    }, [anchor, data, idPrefix]);

    return (
        <div
            ref={containerRef}
            className="relative max-h-[calc(100vh-12rem)] overflow-y-auto leading-[1.65]"
        >
            {data.sentences.map((sentence) => (
                <p
                    key={sentence.idx}
                    id={`${idPrefix}-sentence-${sentence.idx}`}
                    className="m-0 scroll-mt-4 px-1 py-2 [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem] focus:outline-2 focus:outline-offset-2 focus:outline-gray-500"
                    tabIndex={-1}
                >
                    {sentence.text}
                </p>
            ))}
        </div>
    );
};
