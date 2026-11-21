import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTestimonies, useTestimonyLanguages } from '../api/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { parseReaderUrl } from '../readerUrl';
import { BrowseFilters } from '../components/BrowseFilters';
import { TestimonyCard } from '../components/TestimonyCard';

export type BrowseMode = 'source' | 'target';

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
    const filters = useMemo(
        () => ({
            search: search.trim(),
            language: language.trim(),
            location: location.trim(),
        }),
        [language, location, search],
    );
    const activeFilters = useDebouncedValue(filters, 300);
    const testimoniesQuery = useTestimonies(activeFilters);
    const languagesQuery = useTestimonyLanguages();
    const visibleTestimonies =
        testimoniesQuery.data?.filter(
            (testimony) => !excludedDocIds.includes(testimony.id),
        ) ?? [];

    // TODO: implement pagination

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold">Pick a {mode} document</h1>
            <BrowseFilters
                search={search}
                language={language}
                location={location}
                languages={languagesQuery.data ?? []}
                languagesLoading={languagesQuery.isPending}
                onSearchChange={setSearch}
                onLanguageChange={setLanguage}
                onLocationChange={setLocation}
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
            {testimoniesQuery.isSuccess &&
                (visibleTestimonies.length === 0 ? (
                    <p className="my-4">No testimonies match your search.</p>
                ) : (
                    <ul className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] list-none gap-3 p-0">
                        {visibleTestimonies.map((testimony) => (
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
        </div>
    );
};
