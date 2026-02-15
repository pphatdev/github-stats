import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { GitHubClient } from './github-client.js';
import { CardRenderer } from './card-renderer.js';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.warn('⚠️  WARNING: GITHUB_TOKEN is not set!');
    console.warn('⚠️  You will hit rate limits without authentication.');
    console.warn('⚠️  Create a .env file with: GITHUB_TOKEN=your_token_here');
    console.warn('⚠️  Get a token at: https://github.com/settings/tokens');
}

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 0 * 60 * 10; // 10 minutes

app.get('/', (req: Request, res: Response) => {
    res.send(`<!DOCTYPE html>
    <html class="dark" lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Stats Dashboard</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
        <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&family=Cascadia+Code:wght@400;600;700&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet"/>
        <script>
            tailwind.config = {
                darkMode: "class",
                theme: {
                    extend: {
                        colors: {
                            primary: "#14ad61",
                            "background-light": "#F3F4F6",
                            "background-dark": "#0F172A",
                            "card-light": "#FDFDFD",
                            "card-dark": "#1E293B",
                        },
                        fontFamily: {
                            display: ["Ubuntu", "sans-serif"],
                            mono: ["Cascadia Code", "Consolas", "monospace"],
                        },
                        borderRadius: {
                            DEFAULT: "0.75rem",
                            '4xl': '2.5rem'
                        },
                    },
                },
            };
        </script>
    </head>
    <body class="bg-background-light dark:bg-background-dark font-display min-h-screen transition-colors duration-300">
        <!-- Header -->
        <header class="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark">
            <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 flex items-center justify-center bg-primary rounded-xl text-white">
                        <img src="https://pphat.top/assets/logo/logo-transparent-dark-mode.png" alt="GitHub Stats - PPhatDEv" class="w-8 h-8"/>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-slate-900 dark:text-white">GitHub Stats</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Generate dynamic stat cards</p>
                    </div>
                </div>
                <!-- Github -->
                <a href="https://github.com/pphatdev" target="_blank" class="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                    <svg aria-hidden="true" focusable="false" class="size-8" viewBox="0 0 24 24" width="32" height="32" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z"></path></svg>
                </a>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-6 py-12">
            <!-- Hero Section -->
            <div class="bg-gradient-to-br from-primary to-blue-700 rounded-4xl p-12 mb-12 text-white">
                <div class="max-w-3xl">
                    <h2 class="text-4xl font-bold mb-4">Performance Metrics for Your GitHub Profile</h2>
                    <p class="text-blue-100 text-lg mb-8">Generate beautiful, customizable SVG cards displaying GitHub user statistics for your README files. Track stars, commits, PRs, and more.</p>
                    <div class="flex gap-4">
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
                            <p class="text-blue-100 text-sm mb-1">API Calls Cached</p>
                            <p class="text-2xl font-bold">10min</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20">
                            <p class="text-blue-100 text-sm mb-1">Response Time</p>
                            <p class="text-2xl font-bold">&lt;1s</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Demo Section -->
            <div class="grid lg:grid-cols-2 gap-8 mb-12">
                <div class="bg-white dark:bg-card-dark rounded-4xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Live Demo</h3>
                    <p class="text-slate-600 dark:text-slate-400 mb-6">See it in action with sample data</p>
                    <div class="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 flex items-center justify-center">
                        <img src="/stats?username=pphatdev&theme=dark" alt="GitHub Stats" class="w-full max-w-full"/>
                    </div>
                </div>

                <div class="bg-white dark:bg-card-dark rounded-4xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Quick Start</h3>
                    <p class="text-slate-600 dark:text-slate-400 mb-6">Add to your GitHub README in seconds</p>

                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Markdown Code</label>
                            <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
                                <code class="text-sm text-blue-400 font-mono">![Stats](http://localhost:${PORT}/stats?username=YOUR_USERNAME)</code>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">API Endpoint</label>
                            <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
                                <code class="text-sm text-green-400 font-mono">GET /stats?username=YOUR_USERNAME&theme=dark</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Parameters Section -->
            <div class="bg-white dark:bg-card-dark rounded-4xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl mb-12">
                <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">API Parameters</h3>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div class="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-white flex-shrink-0">
                            <span class="material-icons-outlined text-sm">person</span>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-900 dark:text-white">username</p>
                            <p class="text-sm text-slate-600 dark:text-slate-400">GitHub username (required)</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div class="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-white flex-shrink-0">
                            <span class="material-icons-outlined text-sm">visibility_off</span>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-900 dark:text-white">hide_title</p>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Hide the title (true/false)</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div class="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-white flex-shrink-0">
                            <span class="material-icons-outlined text-sm">stars</span>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-900 dark:text-white">hide_rank</p>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Hide the rank badge (true/false)</p>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div class="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-white flex-shrink-0">
                            <span class="material-icons-outlined text-sm">title</span>
                        </div>
                        <div>
                            <p class="font-semibold text-slate-900 dark:text-white">custom_title</p>
                            <p class="text-sm text-slate-600 dark:text-slate-400">Custom card title</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Examples Section -->
            <div class="bg-white dark:bg-card-dark rounded-4xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
                <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Examples</h3>
                <div class="space-y-4">
                    <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
                        <code class="text-sm text-purple-400 font-mono">![Stats](http://localhost:${PORT}/stats?username=pphatdev&theme=tokyonight)</code>
                    </div>
                    <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
                        <code class="text-sm text-pink-400 font-mono">![Stats](http://localhost:${PORT}/stats?username=pphatdev&theme=radical&hide_border=true)</code>
                    </div>
                    <div class="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto">
                        <code class="text-sm text-cyan-400 font-mono">![Stats](http://localhost:${PORT}/stats?username=pphatdev&custom_title=My%20GitHub%20Stats)</code>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-slate-200 dark:border-slate-800 mt-24 bg-white dark:bg-card-dark">
            <div class="max-w-7xl mx-auto px-6 py-8 text-center">
                <p class="text-slate-500 dark:text-slate-400">Made with ❤️ by <a href="https://pphat.top" class="text-primary hover:underline">pphatdev</a></p>
            </div>
        </footer>
    </body>
    </html>`);
});

app.get('/stats', async (req: Request, res: Response) => {
    try {
        const {
            username,
            theme = 'default',
            hide_title,
            hide_border,
            hide_rank,
            show_icons,
            custom_title
        } = req.query;

        if (!username || typeof username !== 'string') {
            return res.status(400).send('Username is required');
        }

        // Check cache
        const cacheKey = `${username}-${theme}-${hide_title}-${hide_border}-${hide_rank}-${show_icons}-${custom_title}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            // return res.send(cached.data);
        }

        // Fetch stats
        const stats = await githubClient.fetchUserStats(username);

        // Generate card
        const card = CardRenderer.generateStatsCard(stats, {
            username,
            theme: theme as string,
            hideTitle: hide_title === 'true',
            hideBorder: hide_border === 'true',
            hideRank: hide_rank === 'true',
            showIcons: show_icons !== 'false',
            customTitle: custom_title as string | undefined,
        });

        // Cache the result
        cache.set(cacheKey, { data: card, timestamp: Date.now() });

        // Send response
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.send(card);
    } catch (error) {
        console.error('Error generating stats:', error);
        res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 GitHub Stats server running on http://localhost:${PORT}`);
    console.log(`📊 Example: http://localhost:${PORT}/stats?username=pphatdev&theme=dark`);
});
