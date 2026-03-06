/**
 * Icons Demo View
 * React component for the animated icons gallery demo page
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface IconsDemoViewProps {
    icons: string[];
}

const IconsDemoComponent: React.FC<IconsDemoViewProps> = ({ icons }) => {
    // Safely escape JSON for HTML embedding to prevent XSS
    const iconsJSON = JSON.stringify(icons)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

    // Initialize component with icons data
    const initScript = `const icons = ${iconsJSON}; initializeIconsDemo(icons);`;

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>All Animated Icons Preview</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="stylesheet" href="/css/icons-demo.css" />
            </head>
            <body>
                <div className="container">
                    <h1>🎨 Animated Tech Icons Gallery</h1>
                    <div className="search-container">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="search-icon"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                            <path d="M21 21l-6 -6" />
                        </svg>
                        <input
                            type="text"
                            className="search-box"
                            id="searchBox"
                            placeholder="Search icons... (e.g., react, vue, typescript)"
                            autoComplete="off"
                        />
                    </div>
                    <div className="grid" id="iconGrid"></div>
                    <div className="stats" id="stats"></div>
                </div>
                <button className="reload-btn">
                    🔄 Replay Animations
                </button>

                <script src="/icons-demo.js"></script>
                <script dangerouslySetInnerHTML={{ __html: initScript }} />
            </body>
        </html>
    );
};

export function generateIconsDemoHTML(props: IconsDemoViewProps): string {
    return '<!DOCTYPE html>' + renderToStaticMarkup(<IconsDemoComponent {...props} />);
}
