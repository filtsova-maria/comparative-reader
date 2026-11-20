import type { Range } from '../api/types';

interface HighlightedTextProps {
    text: string;
    ranges: Range[];
}

export const HighlightedText = ({ text, ranges }: HighlightedTextProps) => {
    const parts = [];
    let position = 0;

    for (const [index, range] of [...ranges]
        .sort((left, right) => left.start - right.start)
        .entries()) {
        const start = Math.max(position, range.start);
        const end = Math.min(text.length, range.end);
        if (start > position) {
            parts.push(text.slice(position, start));
        }
        if (end > start) {
            parts.push(
                <mark key={`${start}-${end}-${index}`}>
                    {text.slice(start, end)}
                </mark>,
            );
        }
        position = Math.max(position, end);
    }

    if (position < text.length) {
        parts.push(text.slice(position));
    }

    return <>{parts}</>;
};
