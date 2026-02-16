# 🚀 GitHub Stats

Generate dynamic, futuristic SVG cards displaying GitHub user statistics for your README files!

<p align="center" style="position:relative;">
  <img align='middle' src='https://stats.sophat.top/stats?username=pphatdev&avatar_mode=radar&data_border_style=frame&data_border_frame=out&theme=default' style="width:100%"/>
  <img align='middle' src='https://stats.sophat.top/languages?username=pphatdev' style="width:100%"/>
  <img align='middle' src='https://stats.sophat.top/languages?username=pphatdev&type=pie' style="width:100%"/>
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

### Typography
- **Ubuntu** - Main UI font for clarity and readability
- **Orbitron** - Futuristic font for numbers and stats
- **Cascadia Code** - Monospace font for terminal displays

## 🔧 Development

### Project Technologies

- **Backend**: Express.js, TypeScript
- **GitHub API**: Octokit REST client
- **Templating**: EJS (Embedded JavaScript)
- **Styling**: Tailwind CSS (via CDN)
- **Fonts**: Google Fonts (Ubuntu, Orbitron, Cascadia Code)
- **Icons**: Material Icons Outlined

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
