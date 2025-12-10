import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen p-6 bg-black text-red-500 font-mono overflow-auto">
                    <h1 className="text-2xl font-bold mb-4">💥 Something went wrong</h1>
                    <div className="bg-gray-900 p-4 rounded mb-4 border border-red-900">
                        <p className="text-lg mb-2">{this.state.error?.toString()}</p>
                    </div>
                    <details className="whitespace-pre-wrap text-sm text-gray-400">
                        <summary className="cursor-pointer hover:text-white mb-2">Stack Trace</summary>
                        {this.state.errorInfo?.componentStack}
                    </details>
                    <button
                        className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                        onClick={() => window.location.reload()}
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
