import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router';
import { getTestimonyData, getTestimonyMetadata } from '../api/testimonies';
import { Document } from './Document';

function readAnchor(value: string | null): number {
    if (!value || !/^\d+$/.test(value)) {
        return 0;
    }

    const anchor = Number(value);
    return Number.isSafeInteger(anchor) ? anchor : 0;
}

interface DocumentPaneProps {
    docId: string;
    anchor: number;
    idPrefix: string;
}

// TODO: rework sentence anchor indexing when implementing OpenSearch
// TODO: add toast notification

const DocumentPane = ({ docId, anchor, idPrefix }: DocumentPaneProps) => {
    const testimonyQuery = useQuery({
        queryKey: ['testimony-data', docId],
        queryFn: ({ signal }) => getTestimonyData(docId, signal),
    });
    const metadataQuery = useQuery({
        queryKey: ['testimony-metadata', docId],
        queryFn: ({ signal }) => getTestimonyMetadata(docId, signal),
    });
    const testimonyName = metadataQuery.data?.Bio.FullName;

    return (
        <section className="min-w-0" aria-label={`document ${docId}`}>
            <h2 className="mb-3 text-xl font-semibold">
                {testimonyName ?? docId}
            </h2>
            {testimonyQuery.isPending && (
                <p role="status">Loading testimony...</p>
            )}
            {testimonyQuery.isError && (
                <p role="alert" className="text-red-700">
                    Could not load testimony: {testimonyQuery.error.message}
                </p>
            )}
            {testimonyQuery.isSuccess && (
                <Document
                    data={testimonyQuery.data}
                    anchor={anchor}
                    idPrefix={idPrefix}
                />
            )}
        </section>
    );
};

export const ReaderView = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const sourceId = searchParams.get('s')?.trim() ?? '';
    const targetId = searchParams.get('t')?.trim() ?? '';
    const sourceAnchor = readAnchor(searchParams.get('sa'));
    const targetAnchor = readAnchor(searchParams.get('ta'));

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
                    targetId ? 'grid gap-6 lg:grid-cols-2' : 'grid grid-cols-1'
                }
            >
                <DocumentPane
                    docId={sourceId}
                    anchor={sourceAnchor}
                    idPrefix="source"
                />
                {targetId && (
                    <DocumentPane
                        docId={targetId}
                        anchor={targetAnchor}
                        idPrefix="target"
                    />
                )}
            </div>
        </div>
    );
};
