import {
    createContext,
    useCallback,
    useContext,
    useLayoutEffect,
    useRef,
    type PropsWithChildren,
} from 'react';
import { useSearchParams } from 'react-router';
import {
    parseReaderUrl,
    withUpdatedReaderAnchor,
    withUpdatedReaderSearch,
    type ReaderRole,
    type ReaderUrlState,
} from '../readerUrl';

interface ReaderUrlStateContextValue {
    state: ReaderUrlState;
    updateAnchor: (role: ReaderRole, anchor: number) => void;
    updateSearch: (role: ReaderRole, search: string) => void;
}

const ReaderUrlStateContext = createContext<ReaderUrlStateContextValue | null>(
    null,
);

function useReaderUrlStateController(): ReaderUrlStateContextValue {
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsRef = useRef(searchParams);
    useLayoutEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    const updateAnchor = useCallback(
        (role: ReaderRole, anchor: number) => {
            const next = withUpdatedReaderAnchor(
                searchParamsRef.current,
                role,
                anchor,
            );
            if (!next) {
                return;
            }

            searchParamsRef.current = next;
            setSearchParams(next, { replace: true });
        },
        [setSearchParams],
    );
    const updateSearch = useCallback(
        (role: ReaderRole, search: string) => {
            const next = withUpdatedReaderSearch(
                searchParamsRef.current,
                role,
                search,
            );
            if (!next) {
                return;
            }

            searchParamsRef.current = next;
            setSearchParams(next, { replace: true });
        },
        [setSearchParams],
    );

    return {
        state: parseReaderUrl(searchParams),
        updateAnchor,
        updateSearch,
    };
}

export function ReaderUrlStateProvider({ children }: PropsWithChildren) {
    const value = useReaderUrlStateController();
    return (
        <ReaderUrlStateContext.Provider value={value}>
            {children}
        </ReaderUrlStateContext.Provider>
    );
}

export function useReaderUrlState(): ReaderUrlStateContextValue {
    const value = useContext(ReaderUrlStateContext);
    if (!value) {
        throw new Error(
            'useReaderUrlState must be used within ReaderUrlStateProvider.',
        );
    }
    return value;
}

export function useReaderPaneUrlState(role: ReaderRole) {
    const { state, updateAnchor, updateSearch } = useReaderUrlState();
    const pane = state[role];
    const updatePaneAnchor = useCallback(
        (anchor: number) => updateAnchor(role, anchor),
        [role, updateAnchor],
    );
    const updatePaneSearch = useCallback(
        (search: string) => updateSearch(role, search),
        [role, updateSearch],
    );
    return {
        ...pane,
        updateAnchor: updatePaneAnchor,
        updateSearch: updatePaneSearch,
    };
}
