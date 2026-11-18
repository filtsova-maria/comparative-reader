import { useQuery } from '@tanstack/react-query';
import { getTestimonyData, getTestimonyMetadata } from '../api/testimonies';
import { Document } from './Document';

interface DocumentPaneProps {
    docId: string;
    anchor: number;
    idPrefix: string;
    onAnchorChange: (anchor: number) => void;
}

export const DocumentPane = ({
    docId,
    anchor,
    idPrefix,
    onAnchorChange,
}: DocumentPaneProps) => {
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
                    onAnchorChange={onAnchorChange}
                />
            )}
        </section>
    );
};
