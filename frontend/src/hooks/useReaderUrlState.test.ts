import { describe, expect, it } from 'vitest';
import {
    buildReaderSearchParams,
    parseDocumentAnchor,
    parseReaderUrl,
    withUpdatedReaderAnchor,
    withUpdatedReaderSearch,
} from '../readerUrl';

describe('parseDocumentAnchor', () => {
    it('accepts safe non-negative integers and defaults invalid values to zero', () => {
        expect(parseDocumentAnchor('27')).toBe(27);
        expect(parseDocumentAnchor(null)).toBe(0);
        expect(parseDocumentAnchor('-1')).toBe(0);
        expect(parseDocumentAnchor(String(Number.MAX_SAFE_INTEGER + 1))).toBe(
            0,
        );
    });
});

describe('parseReaderUrl', () => {
    it('parses both panes using the typed role mapping', () => {
        expect(
            parseReaderUrl(
                new URLSearchParams(
                    's= 06052%20&sa=27&sq=source&t=123&ta=4&tq=target',
                ),
            ),
        ).toEqual({
            source: { id: '06052', anchor: 27, search: 'source' },
            target: { id: '123', anchor: 4, search: 'target' },
        });
    });
});

describe('buildReaderSearchParams', () => {
    it('updates one role while preserving unrelated state and clearing source selection', () => {
        const updated = buildReaderSearchParams(
            new URLSearchParams('s=old&t=other&sq=old&sel=3&filter=English'),
            'source',
            { id: 'new', anchor: 12, search: '' },
        );

        expect(updated.get('s')).toBe('new');
        expect(updated.get('sa')).toBe('12');
        expect(updated.has('sq')).toBe(false);
        expect(updated.get('t')).toBe('other');
        expect(updated.get('filter')).toBe('English');
        expect(updated.has('sel')).toBe(false);
    });
});

describe('withUpdatedAnchor', () => {
    it('updates one anchor while preserving the other query parameters', () => {
        const updated = withUpdatedReaderAnchor(
            new URLSearchParams('s=06052&ta=9&filter=English'),
            'source',
            42,
        );

        expect(updated?.get('s')).toBe('06052');
        expect(updated?.get('sa')).toBe('42');
        expect(updated?.get('ta')).toBe('9');
        expect(updated?.get('filter')).toBe('English');
    });

    it('returns null when the anchor is unchanged', () => {
        expect(
            withUpdatedReaderAnchor(new URLSearchParams('sa=42'), 'source', 42),
        ).toBeNull();
    });
});

describe('withUpdatedSearch', () => {
    it('updates one pane search while preserving the other URL state', () => {
        const updated = withUpdatedReaderSearch(
            new URLSearchParams('s=06052&sa=9&tq=existing'),
            'source',
            'full text',
        );

        expect(updated?.get('sq')).toBe('full text');
        expect(updated?.get('tq')).toBe('existing');
        expect(updated?.get('sa')).toBe('9');
    });

    it('removes a cleared search and skips unchanged values', () => {
        const current = new URLSearchParams('sq=old');
        expect(withUpdatedReaderSearch(current, 'source', '   ')).toEqual(
            new URLSearchParams(),
        );
        expect(withUpdatedReaderSearch(current, 'source', 'old')).toBeNull();
    });
});
