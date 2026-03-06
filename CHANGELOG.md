# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Dynamic per-page OGP meta tags via `transformHead` hook.
- Mermaid.js diagram support via `vitepress-plugin-mermaid`.
- Giscus comments on all doc pages (GitHub Discussions-based).
- MetaBadges component placeholder (disabled until automation pipeline computes values).
- SNS share buttons (X/Twitter, Discord URL copy).
- "この記事は役に立ちましたか？" feedback widget with localStorage persistence.
- JSON-LD structured data (WebPage schema) for SEO.

### Changed

- Updated `automation-scenario-studio` dependency to latest (includes renderer with number_badge, video tag, mermaid flowchart, related scenarios).

## [0.1.0] - 2026-02-23

### Added

- Initial VRChat community guide site built with VitePress
- Automation scenario integration using automation-scenario-studio
- Portable automation support with compile and run workflows
- ESLint and Prettier for code quality
- Accessibility checks with pa11y-ci and contrast validation
- MIT LICENSE

[Unreleased]: https://github.com/metyatech/vrchat-guidebook/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/metyatech/vrchat-guidebook/releases/tag/v0.1.0
