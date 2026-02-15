import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GitHubClient } from './github-client.js';
import { HomeController } from './controllers/home.js';
import { StatsController } from './controllers/stats.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.warn('⚠️  WARNING: GITHUB_TOKEN is not set!');
    console.warn('⚠️  You will hit rate limits without authentication.');
    console.warn('⚠️  Create a .env file with: GITHUB_TOKEN=your_token_here');
    console.warn('⚠️  Get a token at: https://github.com/settings/tokens');
}

app.use(express.static('dist'));

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 0 * 60 * 10; // 10 minutes

// Initialize controllers
StatsController.initialize(githubClient, cache, CACHE_DURATION);

// Routes
app.get('/', HomeController.get);
app.get('/stats', StatsController.get);
app.get('/stats/view', StatsController.view);

app.listen(PORT, () => {
    console.log(`🚀 GitHub Stats server running on http://localhost:${PORT}`);
    console.log(`📊 Example: http://localhost:${PORT}/stats?username=pphatdev&theme=dark`);
});
