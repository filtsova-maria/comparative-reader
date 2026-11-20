import {
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router';
import { BrowseView, type BrowseMode, ReaderView } from './views';

function hasSource(searchParams: URLSearchParams) {
    return Boolean(searchParams.get('s')?.trim());
}

function RootRedirect() {
    const [searchParams] = useSearchParams();
    const location = useLocation();

    return (
        <Navigate
            to={{
                pathname: hasSource(searchParams) ? '/read' : '/pick/source',
                search: location.search,
            }}
            replace
        />
    );
}

function BrowseRoute({ mode }: { mode: BrowseMode }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const excludedDocIds = ['s', 't']
        .map((param) => searchParams.get(param)?.trim())
        .filter((docId): docId is string => Boolean(docId));

    function handleDocumentSelect(
        docId: string,
        anchor = 0,
        fullTextSearch?: string,
    ) {
        const nextSearchParams = new URLSearchParams(searchParams);
        const searchKey = mode === 'source' ? 'sq' : 'tq';
        if (fullTextSearch?.trim()) {
            nextSearchParams.set(searchKey, fullTextSearch);
        } else {
            nextSearchParams.delete(searchKey);
        }

        if (mode === 'source') {
            nextSearchParams.set('s', docId);
            nextSearchParams.set('sa', String(anchor));
            nextSearchParams.delete('sel');
        } else {
            nextSearchParams.set('t', docId);
            nextSearchParams.set('ta', String(anchor));
        }

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

    if (!hasSource(searchParams)) {
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
