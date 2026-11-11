import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { BrowserRouter } from 'react-router'
import App from './App'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const rootElement = document.getElementById('root')

if (!rootElement) {
    throw new Error('Root element "#root" was not found.')
}

const queryClient = new QueryClient()

createRoot(rootElement).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
)
