import { useMemo } from 'react';
import type { TestimonyData } from '../api/types';
import { DocumentText } from './DocumentText';
import { TapeFooter } from './TapeFooter';
import { buildDocumentLayout } from './documentModel';
import { useDocumentPosition } from './useDocumentPosition';

interface DocumentProps {
    data: TestimonyData;
    anchor: number;
    idPrefix: string;
    onAnchorChange: (anchor: number) => void;
}

export const Document = ({
    data,
    anchor,
    idPrefix,
    onAnchorChange,
}: DocumentProps) => {
    const layout = useMemo(
        () => buildDocumentLayout(data.sentences),
        [data.sentences],
    );
    const { containerRef, currentPosition, updateCurrentPosition } =
        useDocumentPosition({
            layout,
            anchor,
            idPrefix,
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
            <DocumentText layout={layout} idPrefix={idPrefix} />
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
