import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
    useTestimonies,
    useTestimonyCount,
    useTestimonyLanguages,
} from '../api/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { parseReaderUrl } from '../readerUrl';
import { BrowseFilters } from '../components/BrowseFilters';
import { TestimonyCard } from '../components/TestimonyCard';

export type BrowseMode = 'source' | 'target';

const PAGE_SIZE = 10;

interface BrowseViewProps {
    mode: BrowseMode;
    excludedDocIds: string[];
    onDocumentSelect: (docId: string) => void;
    onExcerptSelect: (docId: string, anchor: number, search: string) => void;
}

export const BrowseView = ({
    mode,
    excludedDocIds,
    onDocumentSelect,
    onExcerptSelect,
}: BrowseViewProps) => {
    const [searchParams] = useSearchParams();
    const initialSearch = parseReaderUrl(searchParams)[mode].search;
    const [search, setSearch] = useState(initialSearch);
    const [language, setLanguage] = useState('');
    const [location, setLocation] = useState('');
    const [page, setPage] = useState(0);
    const filters = useMemo(
        () => ({
            search: search.trim(),
            language: language.trim(),
            location: location.trim(),
        }),
        [language, location, search],
    );
    const activeFilters = useDebouncedValue(filters, 300);
    const testimoniesQuery = useTestimonies(
        activeFilters,
        {
            limit: PAGE_SIZE + 1,
            offset: page * PAGE_SIZE,
        },
        excludedDocIds,
    );
    const testimonyCountQuery = useTestimonyCount(
        activeFilters,
        excludedDocIds,
    );
    const languagesQuery = useTestimonyLanguages();
    const visibleTestimonies =
        testimoniesQuery.data?.filter(
            (testimony) => !excludedDocIds.includes(testimony.id),
        ) ?? [];
    const hasSearch = Boolean(activeFilters.search);
    const pageTestimonies = hasSearch
        ? visibleTestimonies.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        : visibleTestimonies.slice(0, PAGE_SIZE);
    const hasNextPage = hasSearch
        ? (page + 1) * PAGE_SIZE < visibleTestimonies.length
        : (testimoniesQuery.data?.length ?? 0) > PAGE_SIZE;
    const pageCount = hasSearch
        ? Math.ceil(visibleTestimonies.length / PAGE_SIZE)
        : testimonyCountQuery.data === undefined
          ? null
          : Math.ceil(testimonyCountQuery.data / PAGE_SIZE);

    const changeSearch = (value: string) => {
        setPage(0);
        setSearch(value);
    };
    const changeLanguage = (value: string) => {
        setPage(0);
        setLanguage(value);
    };
    const changeLocation = (value: string) => {
        setPage(0);
        setLocation(value);
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold">Pick a {mode} document</h1>
            <BrowseFilters
                search={search}
                language={language}
                location={location}
                languages={languagesQuery.data ?? []}
                languagesLoading={languagesQuery.isPending}
                onSearchChange={changeSearch}
                onLanguageChange={changeLanguage}
                onLocationChange={changeLocation}
            />

            {languagesQuery.isError && (
                <p role="alert" className="my-4 text-red-700">
                    Could not load languages: {languagesQuery.error.message}
                </p>
            )}

            {testimoniesQuery.isPending && (
                <p className="my-4">Loading testimonies...</p>
            )}
            {testimoniesQuery.isError && (
                <p role="alert" className="my-4 text-red-700">
                    Could not load testimonies: {testimoniesQuery.error.message}
                </p>
            )}
            {testimonyCountQuery.isError && (
                <p role="alert" className="my-4 text-red-700">
                    Could not count testimonies:{' '}
                    {testimonyCountQuery.error.message}
                </p>
            )}
            {testimoniesQuery.isSuccess &&
                (visibleTestimonies.length === 0 ? (
                    <p className="my-4">No testimonies match your search.</p>
                ) : (
                    <ul className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] list-none gap-3 p-0">
                        {pageTestimonies.map((testimony) => (
                            <TestimonyCard
                                key={testimony.id}
                                testimony={testimony}
                                onSelect={onDocumentSelect}
                                onExcerptSelect={(docId, anchor) =>
                                    onExcerptSelect(
                                        docId,
                                        anchor,
                                        activeFilters.search,
                                    )
                                }
                            />
                        ))}
                    </ul>
                ))}

            {testimoniesQuery.isSuccess &&
                visibleTestimonies.length > 0 &&
                (page > 0 || hasNextPage) && (
                    <nav
                        aria-label="Testimony result pages"
                        className="mt-6 flex items-center justify-center gap-4"
                    >
                        <button
                            type="button"
                            onClick={() => setPage((current) => current - 1)}
                            disabled={page === 0 || testimoniesQuery.isFetching}
                            className="rounded border border-gray-400 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous page
                        </button>
                        <span aria-live="polite">
                            Page {page + 1} out of {pageCount ?? '…'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={
                                !hasNextPage || testimoniesQuery.isFetching
                            }
                            className="rounded border border-gray-400 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next page
                        </button>
                    </nav>
                )}
        </div>
    );
};
