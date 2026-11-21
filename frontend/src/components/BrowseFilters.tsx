interface BrowseFiltersProps {
    search: string;
    language: string;
    location: string;
    languages: string[];
    languagesLoading: boolean;
    onSearchChange: (value: string) => void;
    onLanguageChange: (value: string) => void;
    onLocationChange: (value: string) => void;
}

export const BrowseFilters = ({
    search,
    language,
    location,
    languages,
    languagesLoading,
    onSearchChange,
    onLanguageChange,
    onLocationChange,
}: BrowseFiltersProps) => (
    <div className="my-6 flex flex-wrap gap-4">
        <label className="grid flex-1 basis-64 gap-2">
            Search testimonies
            <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search testimonies"
                className="min-h-10 rounded border border-gray-400 bg-white px-3 py-2 font-inherit text-inherit"
            />
        </label>
        <label className="grid flex-1 basis-64 gap-2">
            Filter by language
            <select
                value={language}
                onChange={(event) => onLanguageChange(event.target.value)}
                disabled={languagesLoading}
                className="min-h-10 rounded border border-gray-400 bg-white px-3 py-2 font-inherit text-inherit"
            >
                <option value="">All languages</option>
                {languages.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </label>
        <label className="grid flex-1 basis-64 gap-2">
            Filter by location
            <input
                type="search"
                value={location}
                onChange={(event) => onLocationChange(event.target.value)}
                placeholder="Any location"
                className="min-h-10 rounded border border-gray-400 bg-white px-3 py-2 font-inherit text-inherit"
            />
        </label>
    </div>
);
