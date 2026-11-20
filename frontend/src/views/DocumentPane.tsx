import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
    getTestimonyData,
    getTestimonyMetadata,
    searchWithinTestimony,
} from '../api/testimonies';
import { Document } from './Document';
import { DocumentPaneHeader } from './DocumentPaneHeader';
import { HighlightedText } from './HighlightedText';

interface DocumentPaneProps {
    docId: string;
    anchor: number;
    idPrefix: string;
    role: 'source' | 'target';
    browsePath: string;
    browseSearch: string;
    browseLabel: string;
    secondaryBrowsePath?: string;
    secondaryBrowseLabel?: string;
    onAnchorChange: (anchor: number) => void;
}

export const DocumentPane = ({
    docId,
    anchor,
    idPrefix,
    role,
    browsePath,
    browseSearch,
    browseLabel,
    secondaryBrowsePath,
    secondaryBrowseLabel,
    onAnchorChange,
}: DocumentPaneProps) => {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const testimonyQuery = useQuery({
        queryKey: ['testimony-data', docId],
        queryFn: ({ signal }) => getTestimonyData(docId, signal),
    });
    const metadataQuery = useQuery({
        queryKey: ['testimony-metadata', docId],
        queryFn: ({ signal }) => getTestimonyMetadata(docId, signal),
    });
    useEffect(() => {
        const timeout = window.setTimeout(
            () => setDebouncedSearch(search.trim()),
            300,
        );

        return () => window.clearTimeout(timeout);
    }, [search]);
    const searchQuery = useQuery({
        queryKey: ['testimony-search', docId, debouncedSearch],
        queryFn: ({ signal }) =>
            searchWithinTestimony(docId, debouncedSearch, signal),
        enabled: Boolean(debouncedSearch),
    });
    const hasCurrentSearch =
        Boolean(debouncedSearch) && search.trim() === debouncedSearch;
    const testimonyName = metadataQuery.data?.Bio.FullName;

    return (
        <section className="min-w-0" aria-label={`${role} document ${docId}`}>
            <DocumentPaneHeader
                title={testimonyName}
                documentId={docId}
                browsePath={browsePath}
                browseSearch={browseSearch}
                browseLabel={browseLabel}
                idPrefix={idPrefix}
                search={search}
                onSearchChange={setSearch}
                secondaryBrowsePath={secondaryBrowsePath}
                secondaryBrowseLabel={secondaryBrowseLabel}
            />
            {testimonyQuery.isPending && (
                <p role="status">Loading testimony...</p>
            )}
            {testimonyQuery.isError && (
                <p role="alert" className="text-red-700">
                    Could not load testimony: {testimonyQuery.error.message}
                </p>
            )}
            {hasCurrentSearch && searchQuery.isPending && (
                <p role="status">Searching this testimony...</p>
            )}
            {hasCurrentSearch && searchQuery.isError && (
                <p role="alert" className="text-red-700">
                    Could not search testimony: {searchQuery.error.message}
                </p>
            )}
            {hasCurrentSearch && searchQuery.isSuccess && (
                <div className="mb-4">
                    <p role="status" className="mb-2">
                        {searchQuery.data.hits.length} occurrences in{' '}
                        {searchQuery.data.total_sentences} sentences
                    </p>
                    {searchQuery.data.hits.length === 0 ? (
                        <p>No occurrences found.</p>
                    ) : (
                        <ol className="m-0 max-h-56 list-none space-y-1 overflow-y-auto p-0">
                            {searchQuery.data.hits.map((hit, index) => (
                                <li key={`${hit.idx}-${hit.anchor}-${index}`}>
                                    <button
                                        type="button"
                                        className="w-full rounded border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                        onClick={() =>
                                            onAnchorChange(hit.anchor)
                                        }
                                    >
                                        <span className="mb-1 block text-xs text-gray-600">
                                            Tape {hit.tape} · Sentence{' '}
                                            {hit.idx + 1}
                                        </span>
                                        <span>
                                            <HighlightedText
                                                text={hit.text}
                                                ranges={hit.ranges}
                                            />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
            {testimonyQuery.isSuccess && (
                <Document
                    data={testimonyQuery.data}
                    anchor={anchor}
                    idPrefix={idPrefix}
                    searchHits={
                        hasCurrentSearch && searchQuery.isSuccess
                            ? searchQuery.data.hits
                            : undefined
                    }
                    onAnchorChange={onAnchorChange}
                />
            )}
        </section>
    );
};
