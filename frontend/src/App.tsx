import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router';
import { BrowseView, type BrowseMode, ReaderView } from './views';
import { buildReaderSearchParams, parseReaderUrl } from './readerUrl';

function RootRedirect() {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    return (
        <Navigate
            to={{
                pathname: parseReaderUrl(searchParams).source.id
                    ? '/read'
                    : '/pick/source',
                search: location.search,
            }}
            replace
        />
    );
}

function BrowseRoute({ mode }: { mode: BrowseMode }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const readerUrl = parseReaderUrl(searchParams);
    const excludedDocIds = [readerUrl.source.id, readerUrl.target.id].filter(
        Boolean,
    );

    function handleDocumentSelect(
        docId: string,
        anchor = 0,
        fullTextSearch?: string,
    ) {
        const nextSearchParams = buildReaderSearchParams(searchParams, mode, {
            id: docId,
            anchor,
            search: fullTextSearch ?? '',
        });

        navigate({
            pathname: '/read',
            search: `?${nextSearchParams.toString()}`,
        });
    }

    return (
        <BrowseView
            mode={mode}
            excludedDocIds={excludedDocIds}
            onDocumentSelect={handleDocumentSelect}
            onExcerptSelect={handleDocumentSelect}
        />
    );
}

function ReadRoute() {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    if (!parseReaderUrl(searchParams).source.id) {
        return (
            <Navigate
                to={{ pathname: '/pick/source', search: location.search }}
                replace
            />
        );
    }

    return <ReaderView />;
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route
                path="/pick/source"
                element={<BrowseRoute mode="source" />}
            />
            <Route
                path="/pick/target"
                element={<BrowseRoute mode="target" />}
            />
            <Route path="/read" element={<ReadRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
