import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    textAlign: 'center',
                    background: '#f3f4f6',
                }}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        maxWidth: '400px',
                    }}>
                        <h1 style={{ 
                            fontSize: '1.5rem', 
                            marginBottom: '16px',
                            color: '#1f2937',
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{ 
                            color: '#6b7280', 
                            marginBottom: '24px',
                            fontSize: '0.9rem',
                        }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 24px',
                                background: '#d1d5db',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                color: '#1f2937',
                            }}
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
