# 🚀 GitHub Stats

Generate dynamic, futuristic SVG cards displaying GitHub user statistics for your README files!


<p align="center" style="position:relative;">
  <img align='middle' src='https://stats.sophat.top/stats?username=pphatdev' style="width:100%"/>
</p>



## ✨ Features

- 📊 Dynamic GitHub stats generation with futuristic space theme
- 🎨 Multiple built-in themes with customizable options
- 🔧 Highly customizable with URL parameters
- ⚡ Fast API with 10-minute caching
- 🌐 Easy to deploy (Express, Vercel, Heroku, Railway)
- 💯 Full TypeScript support
- 🖼️ User profile image display in center sphere
- ⭐ Animated starfield, shooting stars, and orbital rings
- 📱 Responsive SVG design (1200x600)
- 🎯 Real-time data visualization with radial beams
- 🔤 Custom fonts (Ubuntu, Orbitron, Cascadia Code)

## Using the API

### Endpoint

```
GET https://stats.sophat.top/stats?username=pphatdev
```

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/github-stats.git
cd github-stats
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your GitHub token to `.env`:
```
GITHUB_TOKEN=your_github_personal_access_token
PORT=3000
```

5. Build and run:
```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

## 🚀 Usage

### Basic Usage

Add this to your GitHub README:

```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME)
```

### With Theme

```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&theme=dark)
```

### Live Example

```markdown
![GitHub Stats](https://stats.sophat.top/stats?username=pphatdev)
```

## 🎨 Available Themes

Choose from multiple carefully designed themes:

| Theme | Description |
|-------|-------------|
| `default` | Classic green theme |
| `dark` | Dark theme with cyan accents |
| `radical` | Pink and cyan futuristic |
| `merko` | Green terminal style |
| `gruvbox` | Retro groove colors |
| `tokyonight` | Tokyo night inspired |
| `onedark` | Atom one dark |
| `cobalt` | Deep blue oceanic |
| `synthwave` | 80s retro vibes |
| `highcontrast` | High contrast accessibility |
| `dracula` | Dracula theme |
| `prussian` | Prussian blue |
| `monokai` | Monokai editor |
| `vue` | Vue.js inspired |

...and many more! See `src/themes.ts` for the complete list.

## ⚙️ Customization Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `username` | GitHub username (required) | - |
| `theme` | Theme name | `default` |
| `hide_title` | Hide the card title | `false` |
| `hide_border` | Hide the card border | `false` |
| `hide_rank` | Hide the rank circle | `false` |
| `show_icons` | Show stat icons | `true` |
| `custom_title` | Custom card title | `{name}'s GitHub Stats` |

### Examples

#### Hide Title
```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&hide_title=true)
```

#### Hide Rank
```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&hide_rank=true)
```

#### Custom Title
```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&custom_title=My%20Awesome%20Stats)
```

#### Combined Options
```markdown
![GitHub Stats](https://your-deployment-url.com/stats?username=YOUR_USERNAME&theme=tokyonight&hide_border=true&show_icons=true)
```

## 📊 Stats Displayed

The card features a futuristic space theme with:

### Center Display
- 🖼️ **User Avatar** - GitHub profile picture in center sphere
- ⭐ **Animated Effects** - Glowing rings, starfield, shooting stars
- 📡 **Radial Beams** - Data visualization with intensity-based beams

### Four Information Panels

1. **Top Left - User Info**
   - Custom/user title
   - Total contributions count
   - Last synchronized timestamp

2. **Top Right - Developer Rank**
   - Rank level (S+, S, A+, A, B+, B, C)
   - Score based on contributions

3. **Bottom Left - Repository Activity**
   - 🔀 Pull Requests
   - 🐛 Issues
   - 📦 Contributed To (repositories)

4. **Bottom Right - Data Stream**
   - Terminal-style output
   - Real-time processing indicators
   - Status display

### Stats Breakdown
- ⭐ **Total Stars** - Stars earned across all repositories
- 📝 **Total Commits** - Total commits made (all-time)
- 🔀 **Total PRs** - Total pull requests created
- 🐛 **Total Issues** - Total issues created
- 🤝 **Contributed to** - Number of repositories contributed to
- 🏆 **Rank** - Calculated rank based on your contributions

## 🏗️ Project Structure

```
github-stats/
├── src/
│   ├── index.ts           # Main Express server with HTML UI
│   ├── github-client.ts   # GitHub API client (Octokit)
│   ├── card-renderer.ts   # SVG card generator with animations
│   ├── themes.ts          # Theme definitions (70+ themes)
│   └── types.ts           # TypeScript interfaces
├── dist/                  # Compiled JavaScript output
├── .github/
│   └── workflows/         # GitHub Actions workflows
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env.example           # Environment variables template
├── .gitignore
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## 🎨 Design Features

### Typography
- **Ubuntu** - Main UI font for clarity
- **Orbitron** - Futuristic font for numbers
- **Cascadia Code** - Monospace for terminal displays

### Visual Effects
- Animated starfield background (100 stars)
- 3 shooting stars with random trajectories
- Rotating orbital rings around center
- Pulsing glow effects on data points
- Radial beam visualization
- Grid overlay pattern
- Scan line effects
- Corner accent decorations

### Cache System
- In-memory caching for 10 minutes
- Reduces GitHub API rate limit usage
- Faster response times for repeated requests

## 🔧 Development

### Build
```bash
npm run build
```

### Run in Development Mode
```bash
npm run dev
```

### Run in Production
```bash
npm start
```

## 🚢 Deployment

### Prerequisites for All Deployments
- GitHub Personal Access Token with `repo` and `user` scopes
- Node.js v16+ runtime support

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variable in Vercel dashboard:
   - `GITHUB_TOKEN` = your_github_token

### Deploy to Heroku

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variable:
```bash
heroku config:set GITHUB_TOKEN=your_token
```

3. Deploy:
```bash
git push heroku main
```

### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Add environment variable:
   - `GITHUB_TOKEN` = your_github_token
3. Railway will automatically deploy on push

### Environment Variables

 Required:
- `GITHUB_TOKEN` - GitHub Personal Access Token

Optional:
- `PORT` - Server port (default: 3000)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [github-readme-stats](https://github.com/anuraghazra/github-readme-stats) by Anurag Hazra
- Themes adapted from various popular editor themes
- Fonts: Ubuntu (Canonical), Orbitron (Matt McInerney), Cascadia Code (Microsoft)
- Built with TypeScript, Express, and Octokit

## 📧 Contact

For questions or support, please open an issue on GitHub.

Made with ❤️ by [pphatdev](https://pphat.top)

---

**Note**: This project uses the GitHub API which has rate limits. Using a GitHub token is highly recommended to avoid hitting these limits.
