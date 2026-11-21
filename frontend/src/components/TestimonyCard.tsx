import type { TestimonySearchResult, TestimonySummary } from '../api/types';
import personImage from '../assets/person.png';
import { HighlightedText } from '../components/HighlightedText';

interface TestimonyCardProps {
    testimony: TestimonySummary | TestimonySearchResult;
    onSelect: (docId: string) => void;
    onExcerptSelect: (docId: string, anchor: number) => void;
}

export const TestimonyCard = ({
    testimony,
    onSelect,
    onExcerptSelect,
}: TestimonyCardProps) => {
    const snippets = 'snippets' in testimony ? (testimony.snippets ?? []) : [];

    return (
        <li className="h-full">
            <article className="h-full overflow-hidden rounded-lg border border-gray-300 bg-white">
                <button
                    type="button"
                    className="flex min-h-[11rem] w-full flex-row items-start gap-4 p-4 text-left text-inherit hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-500"
                    onClick={() => onSelect(testimony.id)}
                >
                    <img
                        src={testimony.thumbnail_url || personImage}
                        alt=""
                        className="block h-24 w-24 shrink-0 aspect-square rounded object-cover"
                    />
                    <span className="flex flex-col gap-1">
                        <span className="text-lg font-semibold">
                            {testimony.name}
                        </span>
                        <span>{testimony.language}</span>
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
                            <span>Duration: {testimony.duration}</span>
                        )}
                    </span>
                </button>
                {snippets.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-3">
                        <ul className="m-0 list-none space-y-2 p-0">
                            {snippets.map((snippet, index) => (
                                <li key={`${snippet.idx}-${index}`}>
                                    <button
                                        type="button"
                                        className="w-full rounded p-2 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                        onClick={() =>
                                            onExcerptSelect(
                                                testimony.id,
                                                snippet.anchor,
                                            )
                                        }
                                    >
                                        <span className="mb-1 block text-xs text-gray-600">
                                            Tape {snippet.tape} · Word{' '}
                                            {snippet.anchor} · Open excerpt
                                        </span>
                                        <span className="block max-h-20 overflow-hidden">
                                            <HighlightedText
                                                text={snippet.text}
                                                ranges={snippet.ranges}
                                            />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </article>
        </li>
    );
};
