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

    function handleDocumentSelect(docId: string) {
        const nextSearchParams = new URLSearchParams(searchParams);

        if (mode === 'source') {
            nextSearchParams.set('s', docId);
            nextSearchParams.set('sa', '0');
            nextSearchParams.delete('sel');
        } else {
            nextSearchParams.set('t', docId);
            nextSearchParams.set('ta', '0');
        }

        navigate({
            pathname: '/read',
            search: `?${nextSearchParams.toString()}`,
        });
    }

    return <BrowseView mode={mode} onDocumentSelect={handleDocumentSelect} />;
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
