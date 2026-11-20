import { faFileLines } from '@fortawesome/free-regular-svg-icons';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router';

interface DocumentPaneHeaderProps {
    title?: string;
    documentId: string;
    browsePath: string;
    browseSearch: string;
    browseLabel: string;
    idPrefix: string;
    search: string;
    onSearchChange: (value: string) => void;
    secondaryBrowsePath?: string;
    secondaryBrowseLabel?: string;
}

const DocumentAction = ({
    browsePath,
    browseSearch,
    browseLabel,
}: Pick<
    DocumentPaneHeaderProps,
    'browsePath' | 'browseSearch' | 'browseLabel'
>) => (
    <Link
        to={{ pathname: browsePath, search: browseSearch }}
        aria-label={browseLabel}
        title={browseLabel}
        className="grid h-8 w-8 shrink-0 place-items-center rounded border border-gray-400 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
    >
        <FontAwesomeIcon
            icon={faFileLines}
            aria-hidden="true"
            className="h-4 w-4 text-gray-500"
        />
    </Link>
);

export const DocumentPaneHeader = ({
    title,
    documentId,
    browsePath,
    browseSearch,
    browseLabel,
    idPrefix,
    search,
    onSearchChange,
    secondaryBrowsePath,
    secondaryBrowseLabel,
}: DocumentPaneHeaderProps) => {
    const identity = (
        <div className="flex min-w-0 basis-52 grow items-center gap-2">
            <DocumentAction
                browsePath={browsePath}
                browseSearch={browseSearch}
                browseLabel={browseLabel}
            />
            <h2 className="min-w-0 font-semibold">
                {title ? `${title} (${documentId})` : documentId}
            </h2>
        </div>
    );
    const searchBar = (
        <div className="flex min-w-0 basis-72 grow items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-gray-400 bg-white px-2">
                <label
                    htmlFor={`${idPrefix}-document-search`}
                    className="shrink-0"
                    title="Search within this testimony"
                >
                    <span className="sr-only">
                        Search within this testimony
                    </span>
                    <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        aria-hidden="true"
                        className="h-4 w-4 text-gray-500"
                    />
                </label>
                <input
                    id={`${idPrefix}-document-search`}
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search document"
                    className="min-h-10 min-w-0 flex-1 bg-white px-3 py-2 font-inherit text-inherit"
                />
            </div>
        </div>
    );

    return (
        <header className="mb-4 flex min-w-0 flex-wrap items-center gap-3">
            {identity}
            {searchBar}
            {secondaryBrowsePath && secondaryBrowseLabel && (
                <div className="flex items-center gap-2">
                    <span className="text-xs max-w-32 text-right">
                        {secondaryBrowseLabel}
                    </span>
                    <DocumentAction
                        browsePath={secondaryBrowsePath}
                        browseSearch={browseSearch}
                        browseLabel={secondaryBrowseLabel}
                    />
                </div>
            )}
        </header>
    );
};
