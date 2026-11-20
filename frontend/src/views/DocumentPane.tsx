import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
    getTestimonyData,
    getTestimonyMetadata,
    searchWithinTestimony,
} from '../api/testimonies';
import { Document } from './Document';
import { DocumentPaneHeader } from './DocumentPaneHeader';
import { SearchResultsPopover } from './SearchResultsPopover';

interface DocumentPaneProps {
    docId: string;
    anchor: number;
    idPrefix: string;
    role: 'source' | 'target';
    browsePath: string;
    browseSearch: string;
    browseLabel: string;
    search: string;
    onSearchChange: (search: string) => void;
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
    search,
    onSearchChange,
    secondaryBrowsePath,
    secondaryBrowseLabel,
    onAnchorChange,
}: DocumentPaneProps) => {
    const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
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
            <SearchResultsPopover
                hasCurrentSearch={hasCurrentSearch}
                isPending={searchQuery.isPending}
                error={searchQuery.isError ? searchQuery.error : null}
                result={searchQuery.isSuccess ? searchQuery.data : null}
                onAnchorChange={onAnchorChange}
            >
                <DocumentPaneHeader
                    title={testimonyName}
                    documentId={docId}
                    browsePath={browsePath}
                    browseSearch={browseSearch}
                    browseLabel={browseLabel}
                    idPrefix={idPrefix}
                    search={search}
                    onSearchChange={onSearchChange}
                    secondaryBrowsePath={secondaryBrowsePath}
                    secondaryBrowseLabel={secondaryBrowseLabel}
                />
            </SearchResultsPopover>
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
