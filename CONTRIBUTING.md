# Contributing to GitHub Stats

Thank you for your interest in contributing to GitHub Stats! 🎉

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear title and description
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:
- A clear title and description
- Use case and benefits
- Example implementation (if you have ideas)

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Ensure code follows the existing style
5. Test your changes
6. Commit with clear messages (`git commit -m 'Add: feature description'`)
7. Push to your branch (`git push origin feature/your-feature`)
8. Open a Pull Request

### Adding New Themes

To add a new theme:

1. Edit the appropriate file in `src/utils/themes/`:
   - `base.ts` - General-purpose themes (stats, languages)
   - `graph.ts` - Graph/heatmap optimized themes
   - `badge.ts` - Badge-specific themes
2. Test the theme with `?theme=yourtheme`
3. Submit a PR with a screenshot

## Development Setup

```bash
# Install dependencies
npm install

# Setup database
npm run db:push

# Run in development mode
npm run dev

# Build
npm run build

# Run production build
npm start

# Run in cluster mode (production)
npm run start:cluster
```

## Code Style

- Use TypeScript
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and small

## Questions?

Feel free to open an issue for any questions!

Thank you for contributing! 🙌
