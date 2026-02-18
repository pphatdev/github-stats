import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GitHubClient } from './utils/github-client.js';
import { HomeController } from './controllers/home.js';
import { StatsController } from './controllers/stats.js';
import { LanguageController } from './controllers/languages.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

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
app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));

const githubClient = new GitHubClient(GITHUB_TOKEN);

// Cache to reduce API calls
const cache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

// Initialize controllers
StatsController.initialize(githubClient, cache, CACHE_DURATION);
LanguageController.initialize(githubClient, cache, CACHE_DURATION);

// API Request
app.get('/stats', StatsController.getSvg);
app.get('/languages', LanguageController.getSvg);


app.get('/preview/stats', StatsController.get);
app.get('/preview/languages', LanguageController.get);

// UI
app.get('/', HomeController.get);

app.listen(PORT, () => {
    console.log(`🚀 GitHub Stats server running on https://localhost:${PORT}`);
    console.log(`📊 Example: https://localhost:${PORT}/stats?username=pphatdev&theme=dark`);
});
