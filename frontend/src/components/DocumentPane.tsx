import { useLocation } from 'react-router';
import {
    useTestimonyData,
    useTestimonyMetadata,
    useTestimonySearch,
} from '../api/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useReaderPaneUrlState } from '../hooks/useReaderUrlState';
import { parseReaderUrl, type ReaderRole } from '../readerUrl';
import { TestimonyDocument } from './TestimonyDocument';
import { DocumentPaneHeader } from './DocumentPaneHeader';
import { SearchResultsPopover } from './SearchResultsPopover';

interface DocumentPaneProps {
    role: ReaderRole;
}

export const DocumentPane = ({ role }: DocumentPaneProps) => {
    const {
        id: docId,
        anchor,
        search,
        updateAnchor: onAnchorChange,
        updateSearch: onSearchChange,
    } = useReaderPaneUrlState(role);
    const location = useLocation();
    const debouncedSearch = useDebouncedValue(search.trim(), 300);
    const testimonyQuery = useTestimonyData(docId);
    const metadataQuery = useTestimonyMetadata(docId);
    const searchQuery = useTestimonySearch(docId, debouncedSearch);
    const hasCurrentSearch =
        Boolean(debouncedSearch) && search.trim() === debouncedSearch;
    const testimonyName = metadataQuery.data?.Bio.FullName;
    const { target } = parseReaderUrl(new URLSearchParams(location.search));
    const showTargetPicker = role === 'source' && !target.id;

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
                    role={role}
                    browseSearch={location.search}
                    search={search}
                    onSearchChange={onSearchChange}
                    showTargetPicker={showTargetPicker}
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
                <TestimonyDocument
                    data={testimonyQuery.data}
                    anchor={anchor}
                    role={role}
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
