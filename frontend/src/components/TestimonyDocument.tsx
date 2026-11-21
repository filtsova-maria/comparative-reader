import { useMemo } from 'react';
import type { TestimonyData, TestimonySearchResponse } from '../api/types';
import type { ReaderRole } from '../readerUrl';
import { DocumentText } from './DocumentText';
import { TapeFooter } from './TapeFooter';
import { buildDocumentLayout } from './documentModel';
import { useDocumentPosition } from './useDocumentPosition';

type SearchHit = Pick<
    TestimonySearchResponse['hits'][number],
    'idx' | 'ranges'
>;

interface TestimonyDocumentProps {
    data: TestimonyData;
    anchor: number;
    role: ReaderRole;
    searchHits?: SearchHit[];
    onAnchorChange: (anchor: number) => void;
}

export const TestimonyDocument = ({
    data,
    anchor,
    role,
    searchHits,
    onAnchorChange,
}: TestimonyDocumentProps) => {
    const layout = useMemo(
        () => buildDocumentLayout(data.sentences),
        [data.sentences],
    );
    const { containerRef, currentPosition, updateCurrentPosition } =
        useDocumentPosition({
            layout,
            anchor,
            idPrefix: role,
            onAnchorChange,
        });
    const tapeLength = currentPosition
        ? data.tape_durations[String(currentPosition.tape)]
        : undefined;

    return (
        <div
            ref={containerRef}
            className="relative flex h-[calc(100vh-12rem)] flex-col overflow-y-auto leading-[1.65] text-lg"
            onScroll={updateCurrentPosition}
        >
            <DocumentText
                layout={layout}
                idPrefix={role}
                searchHits={searchHits}
            />
            {currentPosition && (
                <TapeFooter
                    tape={currentPosition.tape}
                    seconds={currentPosition.seconds}
                    duration={tapeLength}
                />
            )}
        </div>
    );
};
