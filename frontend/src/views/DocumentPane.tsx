import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
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
    role: 'source' | 'target';
    search: string;
    onSearchChange: (search: string) => void;
    onAnchorChange: (anchor: number) => void;
    showTargetPicker?: boolean;
}

export const DocumentPane = ({
    docId,
    anchor,
    role,
    search,
    onSearchChange,
    onAnchorChange,
    showTargetPicker = false,
}: DocumentPaneProps) => {
    const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
    const location = useLocation();
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
    const browsePath = `/pick/${role}`;
    const browseLabel = `Change ${role} document`;
    const secondaryBrowsePath =
        role === 'source' && showTargetPicker ? '/pick/target' : undefined;
    const secondaryBrowseLabel = secondaryBrowsePath
        ? 'Choose target document'
        : undefined;

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
                    browseSearch={location.search}
                    browseLabel={browseLabel}
                    idPrefix={role}
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
                    idPrefix={role}
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
