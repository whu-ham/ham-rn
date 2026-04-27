# Ham React Native

A React Native component monorepo for the Ham app, providing education-related features with over-the-air (OTA) hot update support.

## Features

- **Course Schedule** – Fetch and parse course schedules from the education system
- **Score Query** – Retrieve academic scores with structured parsing
- **Score Calculator** – GPA/weighted score calculation utilities
- **CAS Authentication** – Central Authentication Service login flow (including mobile login)
- **Hot Update** – OTA updates powered by [hot-updater](https://github.com/gronxb/hot-updater)
- **i18n** – Multi-language support (English, Chinese, Japanese)

## Tech Stack

- React Native 0.83 (New Architecture enabled)
- TypeScript
- Jotai (state management)
- i18next (internationalization)
- ESLint + Prettier (code quality)
- pnpm (package manager)

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm
- Xcode (for iOS)
- Android Studio (for Android)
- CocoaPods

### Installation

```bash
pnpm install
```

### iOS Setup

```bash
cd ios && pod install && cd ..
```

### Running

```bash
# Start Metro bundler
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

### Linting

```bash
pnpm lint
```

## Project Structure

```
src/
├── business/          # Business logic layer
│   ├── cas/           # CAS authentication
│   └── education/     # Education system (course, score, scorecalc)
├── components/        # React Native UI components
│   ├── cas/           # CAS login views
│   ├── education/     # Education-related views
│   └── scorecalc/     # Score calculator views
├── i18n/              # Internationalization resources
├── modules/           # Native module specs (Turbo Modules)
├── resources/         # Static assets (images, HTML)
└── utils/             # Shared utilities (color, request, UI)
```

## Deployment

See the `shell/` directory for deployment scripts. Hot updates are managed via `hot-updater`.

## CI/CD

GitHub Actions workflows run on PRs to `main` and pushes to `main`:

- **Lint** – ESLint check
- **Compile Check** – TypeScript type checking
- **Android Build** – Debug APK build verification
- **iOS Build** – Debug build verification

## License

ham-rn is [MIT licensed](./LICENSE).
