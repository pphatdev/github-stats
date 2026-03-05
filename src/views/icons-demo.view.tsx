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
    const iconsJSON = JSON.stringify(icons);

    // Generate script content with proper escaping
    const scriptContent = `
        const icons = ${iconsJSON};

        const grid = document.getElementById('iconGrid');
        const stats = document.getElementById('stats');

        icons.forEach(icon => {
            const card = document.createElement('div');
            card.className = 'icon-card';

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
            copyBtn.title = 'Copy Markdown URL';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                const markdownUrl = '![icon-' + icon + '](https://stats.pphat.top/assets/icons/' + icon + '.svg)';
                navigator.clipboard.writeText(markdownUrl).then(() => {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            };

            const wrapper = document.createElement('div');
            wrapper.className = 'icon-wrapper';

            // Fetch and render SVG inline
            fetch('/assets/icons/' + icon + '.svg')
                .then(response => response.text())
                .then(svgContent => {
                    wrapper.innerHTML = svgContent;
                })
                .catch(() => {
                    wrapper.innerHTML = '❌';
                    wrapper.style.fontSize = '32px';
                });

            const name = document.createElement('div');
            name.className = 'icon-name';
            name.textContent = icon;

            card.appendChild(copyBtn);
            card.appendChild(wrapper);
            card.appendChild(name);
            grid.appendChild(card);
        });

        stats.textContent = 'Total Icons: ' + icons.length;

        // Search functionality
        const searchBox = document.getElementById('searchBox');
        const allCards = document.querySelectorAll('.icon-card');

        searchBox.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            let visibleCount = 0;

            allCards.forEach(card => {
                const iconName = card.querySelector('.icon-name').textContent.toLowerCase();
                if (iconName.includes(searchTerm)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            stats.textContent = visibleCount + ' of ' + icons.length + ' icons' + (searchTerm ? ' (filtered)' : '');
        });
    `;

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>All Animated Icons Preview</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                            min-height: 100vh;
                            padding: 40px 20px;
                        }

                        .container {
                            max-width: 1400px;
                            margin: 0 auto;
                        }

                        h1 {
                            text-align: center;
                            color: white;
                            margin-bottom: 20px;
                            font-size: 2.5rem;
                            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                        }

                        .search-container {
                            max-width: 600px;
                            margin: 0 auto 40px;
                            position: relative;
                        }

                        .search-icon {
                            position: absolute;
                            left: 20px;
                            top: 50%;
                            transform: translateY(-50%);
                            color: #666;
                            pointer-events: none;
                            z-index: 1;
                        }

                        .search-box {
                            width: 100%;
                            padding: 16px 24px 16px 56px;
                            font-size: 16px;
                            border: none;
                            border-radius: 50px;
                            background: rgba(255, 255, 255, 0.95);
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                            outline: none;
                            transition: all 0.3s ease;
                        }

                        .search-box:focus {
                            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                            background: white;
                        }

                        .search-box::placeholder {
                            color: #999;
                        }

                        .grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                            gap: 30px;
                            margin-bottom: 40px;
                        }

                        .icon-card {
                            background: rgba(255, 255, 255, 0.1);
                            backdrop-filter: blur(10px);
                            border-radius: 12px;
                            padding: 20px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 12px;
                            transition: all 0.3s ease;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            position: relative;
                        }

                        .icon-card:hover {
                            transform: translateY(-5px);
                            background: rgba(255, 255, 255, 0.15);
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                        }

                        .icon-card:hover .copy-btn {
                            opacity: 1;
                        }

                        .copy-btn {
                            position: absolute;
                            top: 8px;
                            right: 8px;
                            background: rgba(255, 255, 255, 0.9);
                            color: #1e3c72;
                            border: none;
                            padding: 6px 10px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 10px;
                            font-weight: 600;
                            opacity: 0;
                            transition: all 0.2s ease;
                            z-index: 10;
                        }

                        .copy-btn:hover {
                            background: white;
                            transform: scale(1.05);
                        }

                        .copy-btn.copied {
                            background: #28a745;
                            color: white;
                        }

                        .icon-wrapper {
                            width: 64px;
                            height: 64px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.3s ease;
                        }

                        .icon-card:hover .icon-wrapper svg {
                            filter: drop-shadow(0 0 12px hsla(193, 100%, 82%, 0.50)) 
                                    drop-shadow(0 0 20px rgba(191, 249, 255, 0.3))
                                    drop-shadow(0 0 30px rgba(156, 224, 236, 0.1));
                            transform: scale(1.1);
                        }

                        .icon-wrapper img {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            transition: all 0.3s ease;
                        }

                        .icon-wrapper svg {
                            width: 100%;
                            height: 100%;
                            transition: all 0.3s ease;
                        }
                        .icon-name {
                            color: white;
                            font-size: 11px;
                            text-align: center;
                            word-break: break-word;
                            font-weight: 500;
                        }

                        .stats {
                            text-align: center;
                            color: white;
                            margin-top: 20px;
                            font-size: 14px;
                            opacity: 0.8;
                        }

                        .reload-btn {
                            position: fixed;
                            bottom: 30px;
                            right: 30px;
                            background: rgba(255, 255, 255, 0.2);
                            backdrop-filter: blur(10px);
                            border: 2px solid rgba(255, 255, 255, 0.3);
                            color: white;
                            padding: 15px 30px;
                            border-radius: 50px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                        }

                        .reload-btn:hover {
                            background: rgba(255, 255, 255, 0.3);
                            transform: scale(1.05);
                        }
                    `
                }} />
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
                <button className="reload-btn" onClick={() => window.location.reload()}>
                    🔄 Replay Animations
                </button>

                <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
            </body>
        </html>
    );
};

export function generateIconsDemoHTML(props: IconsDemoViewProps): string {
    return '<!DOCTYPE html>' + renderToStaticMarkup(<IconsDemoComponent {...props} />);
}
