import { Fragment } from 'react';
import type { DocumentLayout } from './documentModel';

interface DocumentTextProps {
    layout: DocumentLayout;
    idPrefix: string;
}

export const DocumentText = ({ layout, idPrefix }: DocumentTextProps) => (
    <div className="flex-1 pb-12">
        {layout.segments.map((segment) => (
            <Fragment key={segment.idx}>
                {segment.dividerBefore && (
                    <hr className="my-4 border-gray-300" />
                )}
                {segment.parts.map((part) =>
                    typeof part === 'string' ? (
                        part
                    ) : (
                        <span
                            key={part.index}
                            id={`${idPrefix}-word-${part.index}`}
                            data-word-index={part.index}
                        >
                            {part.text}
                        </span>
                    ),
                )}{' '}
            </Fragment>
        ))}
    </div>
);
