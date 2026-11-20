import { describe, expect, it } from 'vitest';
import {
    parseDocumentAnchor,
    withUpdatedAnchor,
    withUpdatedSearch,
} from './useReaderUrlState';

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

describe('withUpdatedAnchor', () => {
    it('updates one anchor while preserving the other query parameters', () => {
        const updated = withUpdatedAnchor(
            new URLSearchParams('s=06052&ta=9&filter=English'),
            'sa',
            42,
        );

        expect(updated?.get('s')).toBe('06052');
        expect(updated?.get('sa')).toBe('42');
        expect(updated?.get('ta')).toBe('9');
        expect(updated?.get('filter')).toBe('English');
    });

    it('returns null when the anchor is unchanged', () => {
        expect(
            withUpdatedAnchor(new URLSearchParams('sa=42'), 'sa', 42),
        ).toBeNull();
    });
});

describe('withUpdatedSearch', () => {
    it('updates one pane search while preserving the other URL state', () => {
        const updated = withUpdatedSearch(
            new URLSearchParams('s=06052&sa=9&tq=existing'),
            'sq',
            'full text',
        );

        expect(updated?.get('sq')).toBe('full text');
        expect(updated?.get('tq')).toBe('existing');
        expect(updated?.get('sa')).toBe('9');
    });

    it('removes a cleared search and skips unchanged values', () => {
        const current = new URLSearchParams('sq=old');
        expect(withUpdatedSearch(current, 'sq', '   ')).toEqual(
            new URLSearchParams(),
        );
        expect(withUpdatedSearch(current, 'sq', 'old')).toBeNull();
    });
});
