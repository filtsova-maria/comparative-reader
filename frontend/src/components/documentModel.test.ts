import { describe, expect, it } from 'vitest';
import type { TestimonySentence } from '../api/types';
import { buildDocumentLayout, formatTimecode } from './documentModel';

function sentence(
    idx: number,
    tape: number,
    text: string,
    start_tc: number,
    end_tc: number,
    word_start: number,
): TestimonySentence {
    return {
        idx,
        tape,
        word_start,
        start_char: 0,
        end_char: text.length,
        text,
        start_tc,
        end_tc,
        tc_source: 'interpolated',
        matched_ratio: 1,
        keywords: [],
    };
}

describe('buildDocumentLayout', () => {
    it('indexes words across sentences and interpolates word start times', () => {
        const layout = buildDocumentLayout([
            sentence(0, 1, 'One two', 10, 14, 0),
            sentence(1, 2, 'three', 50, 54, 2),
        ]);

        expect(
            layout.words.map(({ index, text, tape, seconds }) => [
                index,
                text,
                tape,
                seconds,
            ]),
        ).toEqual([
            [0, 'One', 1, 10],
            [1, 'two', 1, 12],
            [2, 'three', 2, 50],
        ]);
        expect(
            layout.segments.map(({ dividerBefore }) => dividerBefore),
        ).toEqual([false, true]);
    });

    it('preserves sentence whitespace when splitting words', () => {
        const text = '  word,\tthen  next ';
        const layout = buildDocumentLayout([sentence(0, 1, text, 0, 3, 0)]);
        const renderedText = layout.segments[0].parts
            .map((part) => (typeof part === 'string' ? part : part.text))
            .join('');

        expect(renderedText).toBe(text);
    });
});

describe('formatTimecode', () => {
    it('formats seconds as minutes and seconds', () => {
        expect(formatTimecode(1829.9)).toBe('30:29');
        expect(formatTimecode(5)).toBe('00:05');
    });
});
