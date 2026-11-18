import { Link, useLocation } from 'react-router';
import { DocumentPane } from './DocumentPane';
import { useReaderUrlState } from '../hooks/useReaderUrlState';

// TODO: add toast notification

export const ReaderView = () => {
    const {
        sourceId,
        targetId,
        sourceAnchor,
        targetAnchor,
        updateSourceAnchor,
        updateTargetAnchor,
    } = useReaderUrlState();
    const location = useLocation();

    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <Link
                    to={{
                        pathname: '/pick/source',
                        search: location.search,
                    }}
                    className="rounded border border-gray-400 px-3 py-2 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-600"
                >
                    {'Change source document'}
                </Link>
                <Link
                    to={{
                        pathname: '/pick/target',
                        search: location.search,
                    }}
                    className="rounded border border-gray-400 px-3 py-2 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-600"
                >
                    {targetId
                        ? 'Change target document'
                        : 'Choose target document'}
                </Link>
            </div>
            <div
                className={
                    targetId
                        ? 'grid gap-6 lg:grid-cols-2'
                        : 'mx-auto grid w-full max-w-screen-md grid-cols-1'
                }
            >
                <DocumentPane
                    docId={sourceId}
                    anchor={sourceAnchor}
                    idPrefix="source"
                    onAnchorChange={updateSourceAnchor}
                />
                {targetId && (
                    <DocumentPane
                        docId={targetId}
                        anchor={targetAnchor}
                        idPrefix="target"
                        onAnchorChange={updateTargetAnchor}
                    />
                )}
            </div>
        </div>
    );
};
