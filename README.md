# 🚀 GitHub Stats

Generate dynamic, futuristic SVG cards displaying GitHub user statistics for your README files!

<p align="center" style="position:relative;">
  <img align='middle' src='https://stats.sophat.top/stats?username=pphatdev' style="width:100%"/>
</p>

<p align="center">
  <a href="https://stats.sophat.top"><img src="https://img.shields.io/badge/Live%20Demo-Visit%20Site-14ad61?style=for-the-badge" alt="Live Demo"></a>
  <a href="https://github.com/pphatdev/stats.sophat.top"><img src="https://img.shields.io/github/stars/pphatdev/stats.sophat.top?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/pphatdev/stats.sophat.top/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/pphatdev/stats.sophat.top/issues"><img src="https://img.shields.io/github/issues/pphatdev/stats.sophat.top?style=for-the-badge" alt="Issues"></a>
</p>

<p align="center">
  <strong>✨ 56+ Themes</strong> • 
  <strong>⚡ Fast API</strong> • 
  <strong>🎨 Beautiful UI</strong> • 
  <strong>💯 TypeScript</strong> • 
  <strong>♿ Accessible</strong>
</p>

## ✨ Features

### 🎨 Visual & Design
- 🌌 Futuristic space theme with animated starfield and orbital rings
- 🎯 Radial beam data visualization with intensity-based graphics
- 🖼️ User profile image display in center sphere with glowing effects
- 📱 Responsive SVG design (1200x600)
- 🔤 Custom fonts (Ubuntu, Orbitron, Cascadia Code)
- ⚡ Smooth loading animations with spinner indicators
- 🎨 Tailwind CSS v4 with custom theme configuration

### 🛠️ Functionality
- 📊 Dynamic GitHub stats generation via REST API
- 🌐 Interactive web UI with live preview and customization
- 🎨 **56+ built-in themes** with full customization support
- 🔧 Real-time preview updates with loading states
- ⚡ Fast API with 10-minute caching system
- 💾 In-memory cache to reduce API rate limit usage
- 🔒 Secure GitHub API integration with token support
- 🖼️ Visual theme gallery with live previews
- 📐 Feature stats grid with performance metrics

### 💻 Technical
- 💯 Full TypeScript support with strict typing
- 🏗️ MVC architecture (controllers, views, services)
- 🎨 EJS templating with reusable partials (head, header)
- 📦 Express.js backend with CORS support
- 🌐 Easy to deploy (Vercel, Heroku, Railway)
- 🔄 RESTful API endpoints
- 🔍 Comprehensive SEO optimization (Open Graph, Twitter Cards, JSON-LD)
- ♿ Full accessibility support (ARIA labels, semantic HTML)
- 🎯 Modern CSS with Tailwind v4 and custom properties

## 🌐 API Endpoints

### Main Endpoints

#### `GET /`
Home page with live demo, interactive form, and documentation.

#### `GET /stats`
Generate SVG stats card.

**Example:**
```
GET https://stats.sophat.top/stats?username=pphatdev&theme=dark
```

#### `GET /stats/view`
Web interface for customizing and previewing stats cards with real-time updates.

**Example:**
```
GET https://stats.sophat.top/stats/view?username=pphatdev&theme=dark
```

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
  - Required scopes: `repo`, `user`

### Setup

1. **Clone the repository:**
```bash
git clone https://github.com/pphatdev/stats.sophat.top.git
cd stats.sophat.top
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure environment variables in `.env`:**
```env
GITHUB_TOKEN=your_github_personal_access_token
PORT=3000
```

5. **Build the project:**
```bash
npm run build
```
This compiles TypeScript, copies assets (views, fonts), and builds optimized CSS with Tailwind v4.

6. **Start the server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

7. **Access the application:**
- Open your browser to `http://localhost:3000`
- API endpoint: `http://localhost:3000/stats?username=YOUR_USERNAME`

## 🚀 Usage

### Web Interface

The application includes a fully-featured web interface for easy stats generation:

1. **Home Page** (`/`)
   - Live demo with real-time preview and loading states
   - Interactive form to generate stats for any GitHub user
   - **Theme gallery** with 12 featured themes and visual previews
   - **Feature showcase** with performance metrics (56+ themes, <1s response, 10min cache, 100% TypeScript)
   - Quick start guide with copy-ready code examples
   - Loading indicators during image generation
   - SEO optimized with Open Graph and Twitter Cards

2. **Stats Preview Page** (`/stats/view`)
   - Full customization interface with live preview
   - Options for themes, title, rank, icons, etc.
   - Copy-ready Markdown and HTML embed codes with one-click copy
   - All changes update the preview in real-time
   - Loading overlays during preview generation
   - Direct link to user's GitHub profile

### API Endpoint

#### Basic Usage

Add this to your GitHub README:

```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME)
```

#### With Theme

```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&theme=dark)
```

#### Live Example

```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev)
```

## 🎨 Available Themes

Choose from **56+ carefully designed themes**! Visit the [live theme gallery](https://stats.sophat.top) to browse all themes with visual previews.

### Popular Themes

| Theme | Preview | Description |
|-------|---------|-------------|
| `default` | ![Default](https://stats.sophat.top/stats?username=pphatdev) | Classic green theme |
| `dark` | ![Dark](https://stats.sophat.top/stats?username=pphatdev&theme=dark) | Dark theme with cyan accents |
| `radical` | ![Radical](https://stats.sophat.top/stats?username=pphatdev&theme=radical) | Pink and cyan futuristic |
| `tokyonight` | ![Tokyo Night](https://stats.sophat.top/stats?username=pphatdev&theme=tokyonight) | Tokyo night inspired |
| `dracula` | ![Dracula](https://stats.sophat.top/stats?username=pphatdev&theme=dracula) | Dracula official theme |
| `monokai` | ![Monokai](https://stats.sophat.top/stats?username=pphatdev&theme=monokai) | Monokai classic |

### All Available Themes

`default`, `dark`, `radical`, `merko`, `gruvbox`, `tokyonight`, `onedark`, `cobalt`, `synthwave`, `highcontrast`, `dracula`, `prussian`, `monokai`, `vue`, `nightowl`, `algolia`, `darcula`, `bear`, `nord`, `gotham`, `graywhite`, `material`, `github_dark`, `ayu_dark`, `moonlight`, `cobalt2`, `catppuccin_mocha`, `catppuccin_latte`, and **40+ more**!

See [src/themes.ts](src/themes.ts) for the complete list of all 56 themes.

## ⚙️ Customization Options

All options can be customized via URL parameters or the web interface.

| Parameter | Description | Type | Default |
|-----------|-------------|------|---------|
| `username` | GitHub username | string (required) | - |
| `theme` | Theme name | string | `default` |
| `hide_title` | Hide the card title | boolean | `false` |
| `hide_rank` | Hide the rank circle | boolean | `false` |
| `custom_title` | Custom card title | string | `{name}'s GitHub Stats` |

### Examples

#### Hide Title
```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev&hide_title=true)
```

#### Hide Rank
```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev&hide_rank=true)
```

#### Custom Title
```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev&custom_title=My%20Awesome%20Stats)
```

#### Combined Options
```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev&theme=tokyonight&hide_rank=true&custom_title=Developer%20Stats)
```

## 📊 Stats Displayed

The card features a stunning space-themed design with:

### Visual Elements
- 🌌 **Animated Starfield** - Dynamic background with twinkling stars
- 🌀 **Orbital Rings** - Rotating rings around the center sphere
- 🎯 **Radial Data Beams** - Intensity-based visualization radiating from center
- ✨ **Glow Effects** - Neon glow on data points and profile image
- 🖼️ **Profile Avatar** - Your GitHub profile picture in the center sphere

### Statistics Shown

| Stat | Description | Position |
|------|-------------|----------|
| ⭐ **Total Stars** | Stars earned across all repositories | Radial beam (0°) |
| 📝 **Total Commits** | All-time commit count | Radial beam (72°) |
| 🔀 **Total PRs** | Pull requests created | Radial beam (144°) |
| 🐛 **Total Issues** | Issues created | Radial beam (216°) |
| 🤝 **Contributed To** | Number of repositories contributed to | Radial beam (288°) |

### Additional Information
- Custom title (or user's name by default)
- Total contributions count
- Developer rank (S+, S, A+, A, B+, B, C) based on activity
- Last synchronized timestamp

## 🏗️ Project Structure

```
stats.sophat.top/      # Main Express server setup
│   ├── github-client.ts            # GitHub API client (Octokit)
│   ├── card-renderer.ts            # SVG card generator with animations
│   ├── themes.ts                   # Theme definitions (56 themes)
│   ├── types.ts                    # TypeScript interfaces
│   ├── controllers/
│   │   ├── controller.ts           # Base controller class
│   │   ├── home.ts                 # Home page controller
│   │   └── stats.ts                # Stats API & view controller
│   ├── views/
│   │   ├── layouts/
│   │   │   └── main.ejs            # Main layout with SEO meta tags
│   │   ├── pages/
│   │   │   ├── index.ejs           # Home page with demo, theme gallery
│   │   │   └── stats.ejs           # Stats customization page
│   │   └── partials/
│   │       └── header.ejs          # Reusable header navigation
│   ├── styles/
│   │   └── app.css                 # Tailwind CSS v4 configuration
│   └── fonts/                      # Custom font files
├── dist/                           # Compiled JavaScript & assets
│   ├── css/                        # Compiled Tailwind CSS
│   ├── fonts/                      # Copied font files
│   └── views/                      # Copied EJS templates
├── .env.example                    # Environment variables template
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

### Key Components

- **Controllers**: Handle HTTP requests and responses (MVC pattern)
- **Views**: 
  - **Layouts**: Main layout with SEO optimization and meta tags
  - **Pages**: Individual page templates (index, stats)
  - **Partials**: Reusable components (header with star button)
- **Services**: GitHub API client and card rendering logic
- **Cache System**: In-memory caching for API responses
- **Styles**: Tailwind CSS v4 with custom theme configuration
- **Services**: GitHub API client and card rendering logic
- **Cache System**: In-memory caching for API responses

## 🎨 Design Features

### Typography
- **Ubuntu** - Main UI font for clarity and readability
- **Orbitron** - Futuristic font for numbers and stats
- **Cascadia Code** - Monospace font for terminal displays

### Visual Effects
- 🌟 Animated starfield background (30+ stars with varying opacity)
- 🌀 Multiple rotating orbital rings around center sphere
- 📡 Radial beam visualization based on stat intensity
- ✨ Pulsing glow effects on data points and profile image
- 🎯 Dynamic gradient backgrounds with Tailwind CSS v4
- 📊 Real-time data visualization
- 🖼️ Smooth loading animations with spinner indicators
- 🎨 Theme gallery with 12 featured themes and visual previews
- ⭐ GitHub star button in navigation header

### Performance
- 📦 Optimized SVG output for smaller file sizes
- 💾 In-memory caching system (10-minute duration)
- ⚡ Fast response times with GitHub API rate limit management
- 🔄 Automatic cache invalidation
- 🚀 Optimized CSS with Tailwind v4 compilation
- 📱 Responsive design with mobile-first approach

### SEO & Accessibility
- 🔍 Comprehensive meta tags (title, description, keywords)
- 📱 Open Graph tags for social media sharing
- 🐦 Twitter Card optimization
- 📊 JSON-LD structured data for search engines
- ♿ ARIA labels and semantic HTML throughout
- 🔗 Proper canonical URLs and robots meta tags
- 📦 Optimized SVG output for smaller file sizes
- 💾 In-memory caching system (configurable duration)
- ⚡ Fast response times with GitHub API rate limit management
- 🔄 Automatic cache invalidation

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------| v4.18, TypeScript v5.3
- **GitHub API**: Octokit REST v20.0
- **Templating**: EJS v3.1 with reusable partials (layouts, pages, partials)
- **Styling**: Tailwind CSS v4.1 with custom configuration
- **Build Tools**: 
  - TypeScript Compiler (tsc)
  - Tailwind CLI for CSS compilation
  - Custom build scripts for asset copying
- **Fonts**: Google Fonts (Ubuntu, Orbitron, Cascadia Code)
- **Icons**: Material Icons Outlined
- **SEO**: Open Graph, Twitter Cards, JSON-LD structured data
- **Accessibility**: ARIA labels, semantic HTML, proper roles
### Development Workflow

1. Make changes to files in `src/`
2. Run `npm run dev` for auto-reload during development
3. Test your changes at `http://localhost:3000`
4. Build for production with `npm run build`

### Project Technologies

- **Backend**: Express.js, TypeScript
- **GitHub API**: Octokit REST client
- **Templating**: EJS (Embedded JavaScript)
- **Styling**: Tailwind CSS (via CDN)
- **Fonts**: Google Fonts (Ubuntu, Orbitron, Cascadia Code)
- **Icons**: Material Icons Outlined

## 🚢 Deployment

### Build Requirements

Before deploying, ensure your build process includes:
1. TypeScript compilation: `tsc`
2. Font copying: `npm run copy:font`
3. View copying: `npm run copy:view`
4. CSS compilation: `npm run build:css`

Or simply run: `npm run build` (handles all of the above)

### Environment Variables

Required for all deployments:

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx` |
| `PORT` | Server port (optional) | `3000` |

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard or CLI:
```bash
vercel env add GITHUB_TOKEN
```

### Deploy to Heroku

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variables:
```bash
heroku config:set GITHUB_TOKEN=your_token_here
```

3. Deploy:
```bash
git push heroku main
```

### Deploy to Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Add environment variable `GITHUB_TOKEN` in the Railway dashboard
3. Railway will automatically deploy on every push to main branch

### Other Platforms

This is a standard Node.js/Express application and can be deployed to any platform that supports Node.js v16+, including:
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run
- Render
- Fly.io

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute

1. Fork the repository
2. Create your feature branch 
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Make your changes and test thoroughly
4. Commit your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
5. Push to your branch
   ```bash
   git push origin feature/AmazingFeature
   ```
6. Open a Pull Request

### Contribution Ideas

- 🎨 Add new themes (we have 56, let's get to 100!)
- ✨ Improve animations and visual effects
- 🐛 Fix bugs and improve error handling
- 📚 Improve documentation
- 🧪 Add tests and improve test coverage
- ⚡ Performance optimizations
- ♿ Enhance accessibility features
- 🌍 Add internationalization (i18n)
- 📱 Mobile app or PWA version
- 🔌 Create plugins or extensions

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) by Anurag Hazra
- Themes adapted from popular editor themes and color schemes
- Fonts: 
  - Ubuntu by Canonical
  - Orbitron by Matt McInerney
  - Cascadia Code by Microsoft
- Built with TypeScript, Express.js, and Octokit
- UI styled with Tailwind CSS v4
- Icons from Material Design Icons
- SEO best practices from Google and Open Graph protocol

## 📧 Support

- 🐛 [Report a bug](https://github.com/pphatdev/stats.sophat.top/issues)
- 💡 [Request a feature](https://github.com/pphatdev/stats.sophat.top/issues)
- 💬 [Ask a question](https://github.com/pphatdev/stats.sophat.top/discussions)
- ⭐ [Star the repository](https://github.com/pphatdev/stats.sophat.top)

---

<p align="center">
Made with ❤️ by <a href="https://pphat.top">pphatdev</a>
</p>

<p align="center">
<strong>⭐ Star this repo if you find it useful! ⭐</strong>
</p>

---

**Note**: This project uses the GitHub REST API via Octokit, which has rate limits. Using a GitHub Personal Access Token is highly recommended to avoid hitting rate limits:
- **Without token**: 60 requests per hour
- **With token**: 5,000 requests per hour

The built-in caching system (10-minute duration) helps minimize API calls and stay within rate limits.
