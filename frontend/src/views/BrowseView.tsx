import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { listLanguages, listTestimonyMetadata } from '../api/testimonies';
import personImage from '../assets/person.png';

export type BrowseMode = 'source' | 'target';

interface BrowseViewProps {
    mode: BrowseMode;
    onDocumentSelect: (docId: string) => void;
}

export const BrowseView = ({ mode, onDocumentSelect }: BrowseViewProps) => {
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
        queryFn: ({ signal }) =>
            listTestimonyMetadata(
                {
                    search: debouncedSearch || undefined,
                    language: language || undefined,
                },
                signal,
            ),
    });
    const languagesQuery = useQuery({
        queryKey: ['testimony-languages'],
        queryFn: ({ signal }) => listLanguages(signal),
    });

    // TODO: implement pagination
    // TODO: implement OpenSearch API fulltext search for testimonies

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold">Pick a {mode} document</h1>
            <div className="my-6 flex flex-wrap gap-4">
                <label className="grid flex-1 basis-64 gap-2">
                    Search by name
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search testimonies"
                        className="min-h-10 rounded border border-gray-400 bg-white px-3 py-2 font-inherit text-inherit"
                    />
                </label>
                <label className="grid flex-1 basis-64 gap-2">
                    Filter by language
                    <select
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        disabled={languagesQuery.isPending}
                        className="min-h-10 rounded border border-gray-400 bg-white px-3 py-2 font-inherit text-inherit"
                    >
                        <option value="">All languages</option>
                        {languagesQuery.data?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

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
                (testimoniesQuery.data.length === 0 ? (
                    <p className="my-4">No testimonies match your search.</p>
                ) : (
                    <ul className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] list-none gap-3 p-0">
                        {testimoniesQuery.data.map((testimony) => (
                            <li key={testimony.id} className="h-full">
                                <button
                                    type="button"
                                    className="flex h-full min-h-[11rem] max-h-[15rem] w-full flex-row items-start gap-4 overflow-hidden rounded-lg border border-gray-300 bg-white p-4 text-left text-inherit hover:border-gray-600 hover:bg-gray-50 focus-visible:border-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                    onClick={() =>
                                        onDocumentSelect(testimony.id)
                                    }
                                >
                                    <img
                                        src={
                                            testimony.thumbnail_url ||
                                            personImage
                                        }
                                        alt={testimony.name}
                                        className="block h-24 w-24 shrink-0 aspect-square rounded object-cover"
                                    />
                                    <div className="flex flex-col gap-1 text-left">
                                        <span className="text-lg font-semibold">
                                            {testimony.name}
                                        </span>
                                        <span>
                                            {testimony.language}
                                            {testimony.experience
                                                ? ` · ${testimony.experience}`
                                                : ''}
                                        </span>
                                        {testimony.location && (
                                            <span>{testimony.location}</span>
                                        )}
                                        {testimony.interview_date && (
                                            <span>
                                                Interviewed{' '}
                                                {new Date(
                                                    testimony.interview_date,
                                                ).toLocaleDateString()}
                                            </span>
                                        )}
                                        {testimony.duration && (
                                            <span>
                                                Duration: {testimony.duration}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ))}
        </div>
    );
};
