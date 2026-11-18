import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
    listLanguages,
    listTestimonyMetadata,
    // searchTestimonies,
} from '../api/testimonies';
import { BrowseFilters } from './BrowseFilters';
import { TestimonyCard } from './TestimonyCard';

export type BrowseMode = 'source' | 'target';

interface BrowseViewProps {
    mode: BrowseMode;
    excludedDocIds: string[];
    onDocumentSelect: (docId: string) => void;
}

export const BrowseView = ({
    mode,
    excludedDocIds,
    onDocumentSelect,
}: BrowseViewProps) => {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [language, setLanguage] = useState('');

    useEffect(() => {
        const timeout = window.setTimeout(
            () => setDebouncedSearch(search.trim()),
            300,
        );

        return () => window.clearTimeout(timeout);
    }, [search]);

    const testimoniesQuery = useQuery({
        queryKey: [
            'testimonies',
            { search: debouncedSearch, language },
        ] as const,
        // TODO: reenable search once implemented on backend
        // queryFn: ({ signal }) =>
        //     debouncedSearch
        //         ? searchTestimonies(
        //               {
        //                   search: debouncedSearch,
        //                   language: language || undefined,
        //               },
        //               signal,
        //           )
        //         : listTestimonyMetadata(
        //               { language: language || undefined },
        //               signal,
        //           ),
        queryFn: ({ signal }) =>
            listTestimonyMetadata({ language: language || undefined }, signal),
    });
    const languagesQuery = useQuery({
        queryKey: ['testimony-languages'],
        queryFn: ({ signal }) => listLanguages(signal),
    });
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
                languages={languagesQuery.data ?? []}
                languagesLoading={languagesQuery.isPending}
                onSearchChange={setSearch}
                onLanguageChange={setLanguage}
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
                            />
                        ))}
                    </ul>
                ))}
        </div>
    );
};
