import { memo, useMemo } from 'react';
import type { Range, TestimonySearchResponse } from '../api/types';
import type { DocumentLayout, TranscriptSegment } from './documentModel';
import { HighlightedText } from './HighlightedText';

type SearchHit = Pick<
    TestimonySearchResponse['hits'][number],
    'idx' | 'ranges'
>;

const EMPTY_SEARCH_HITS: SearchHit[] = [];

interface DocumentSegmentProps {
    segment: TranscriptSegment;
    idPrefix: string;
    wordRanges?: Map<number, Range[]>;
}

const DocumentSegment = memo(
    ({ segment, idPrefix, wordRanges }: DocumentSegmentProps) => (
        <span data-segment-index={segment.idx}>
            {segment.dividerBefore && <hr className="my-4 border-gray-300" />}
            {segment.parts.map((part) => {
                if (typeof part === 'string') {
                    return part;
                }

                const ranges = wordRanges?.get(part.index);
                return (
                    <span
                        key={part.index}
                        id={`${idPrefix}-word-${part.index}`}
                        data-word-index={part.index}
                    >
                        {ranges ? (
                            <HighlightedText text={part.text} ranges={ranges} />
                        ) : (
                            part.text
                        )}
                    </span>
                );
            })}{' '}
        </span>
    ),
);

interface DocumentTextProps {
    layout: DocumentLayout;
    idPrefix: string;
    searchHits?: SearchHit[];
}

export const DocumentText = memo(
    ({
        layout,
        idPrefix,
        searchHits = EMPTY_SEARCH_HITS,
    }: DocumentTextProps) => {
        // memoize sentences to only rerender the highlighted ones
        const segmentsByIndex = useMemo(() => {
            const segments = new Map<number, TranscriptSegment>();
            for (const segment of layout.segments) {
                segments.set(segment.idx, segment);
            }
            return segments;
        }, [layout]);

        const rangesBySentence = useMemo(() => {
            const rangesByIndex = new Map<number, Map<number, Range[]>>();
            const rangesBySegment = new Map<number, Range[]>();
            for (const hit of searchHits) {
                const ranges = rangesBySegment.get(hit.idx) ?? [];
                ranges.push(...hit.ranges);
                rangesBySegment.set(hit.idx, ranges);
            }

            for (const [sentenceIndex, sentenceRanges] of rangesBySegment) {
                const segment = segmentsByIndex.get(sentenceIndex);
                if (!segment) {
                    continue;
                }

                let textOffset = 0;
                const rangesByWord = new Map<number, Range[]>();
                for (const part of segment.parts) {
                    if (typeof part === 'string') {
                        textOffset += part.length;
                        continue;
                    }

                    const wordStart = textOffset;
                    const wordEnd = wordStart + part.text.length;
                    const localRanges = sentenceRanges.flatMap((range) => {
                        const start = Math.max(wordStart, range.start);
                        const end = Math.min(wordEnd, range.end);
                        return start < end
                            ? [
                                  {
                                      start: start - wordStart,
                                      end: end - wordStart,
                                  },
                              ]
                            : [];
                    });
                    if (localRanges.length > 0) {
                        rangesByWord.set(part.index, localRanges);
                    }
                    textOffset = wordEnd;
                }
                rangesByIndex.set(sentenceIndex, rangesByWord);
            }
            return rangesByIndex;
        }, [searchHits, segmentsByIndex]);

        return (
            <div className="flex-1 pb-12">
                {layout.segments.map((segment) => (
                    <DocumentSegment
                        key={segment.idx}
                        segment={segment}
                        idPrefix={idPrefix}
                        wordRanges={rangesBySentence.get(segment.idx)}
                    />
                ))}
            </div>
        );
    },
);
