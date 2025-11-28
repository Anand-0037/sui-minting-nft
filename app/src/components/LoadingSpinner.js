import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
    size = 'medium', 
    color = 'primary',
    message = 'Loading...',
    showMessage = true,
    fullScreen = false
}) => {
    const sizeClass = `spinner-${size}`;
    const colorClass = `spinner-${color}`;

    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                <div className="loading-content">
                    <div className={`spinner ${sizeClass} ${colorClass}`}>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                    {showMessage && <p className="loading-message">{message}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="loading-container">
            <div className={`spinner ${sizeClass} ${colorClass}`}>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
            </div>
            {showMessage && <p className="loading-message">{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
