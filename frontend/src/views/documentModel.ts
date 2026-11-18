import type { TestimonySentence } from '../api/types';

export interface IndexedWord {
    kind: 'word';
    index: number;
    text: string;
    tape: number;
    seconds: number;
}

export type TranscriptPart = string | IndexedWord;

export interface TranscriptSegment {
    idx: number;
    dividerBefore: boolean;
    parts: TranscriptPart[];
}

export interface DocumentLayout {
    segments: TranscriptSegment[];
    words: IndexedWord[];
}

export function buildDocumentLayout(
    sentences: TestimonySentence[],
): DocumentLayout {
    const words: IndexedWord[] = [];
    let previousTape: number | undefined;

    const segments = sentences.map((sentence) => {
        const tokens = sentence.text.split(/(\s+)/);
        const wordCount = tokens.filter(
            (token) => token.length > 0 && !/^\s+$/.test(token),
        ).length;
        let sentenceWordIndex = 0;
        const parts = tokens.flatMap((token): TranscriptPart[] => {
            if (!token) {
                return [];
            }
            if (/^\s+$/.test(token)) {
                return [token];
            }

            const word: IndexedWord = {
                kind: 'word',
                index: words.length,
                text: token,
                tape: sentence.tape,
                seconds:
                    sentence.start_tc +
                    ((sentence.end_tc - sentence.start_tc) *
                        sentenceWordIndex++) /
                        wordCount,
            };
            words.push(word);
            return [word];
        });
        const dividerBefore =
            previousTape !== undefined && sentence.tape !== previousTape;
        previousTape = sentence.tape;

        return { idx: sentence.idx, dividerBefore, parts };
    });

    return { segments, words };
}

export function formatTimecode(seconds: number): string {
    const wholeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(wholeSeconds / 60);
    const remainingSeconds = wholeSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
