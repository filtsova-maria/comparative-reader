import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TestimonySentence } from '../api/types';
import { buildDocumentLayout } from './documentModel';
import { DocumentText } from './DocumentText';

function sentence(idx: number, text: string): TestimonySentence {
    return {
        idx,
        tape: 1,
        start_char: 0,
        end_char: text.length,
        text,
        start_tc: 0,
        end_tc: 1,
        tc_source: 'interpolated',
        matched_ratio: 1,
        keywords: [],
    };
}

describe('DocumentText', () => {
    it('highlights each search occurrence within its sentence words', () => {
        const layout = buildDocumentLayout([
            sentence(4, '😀 hello help'),
            sentence(5, 'no match here'),
        ]);
        const markup = renderToStaticMarkup(
            <DocumentText
                layout={layout}
                idPrefix="source"
                searchHits={[
                    { idx: 4, ranges: [{ start: 3, end: 5 }] },
                    { idx: 4, ranges: [{ start: 9, end: 11 }] },
                ]}
            />,
        );

        expect(markup.match(/<mark>/g)).toHaveLength(2);
        expect(markup.match(/<mark>he<\/mark>/g)).toHaveLength(2);
        expect(markup).toContain('data-word-index="1"');
        expect(markup).toContain('data-word-index="2"');
    });
});
