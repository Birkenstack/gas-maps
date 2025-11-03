# Repository Guidelines

## Project Structure & Module Organization
This Expo Router app keeps navigation-first features in `app/`, with `_layout.tsx` handling tab chrome and screens like `(tabs)/index.tsx` and `modal.tsx` grouped by route. Shared view logic lives in `components/`, hooks in `hooks/`, and app-level constants in `constants/`. Static images and fonts ship from `assets/`, while `scripts/` hosts maintenance utilities such as `reset-project.js`. TypeScript paths are unified through `tsconfig.json` so imports can use the `@/` alias from the repository root. Platform configuration stays in `app.json` and `expo-env.d.ts`, so review those before introducing new native capabilities.

## Build, Test, and Development Commands
- `npm install`: bootstrap dependencies after cloning or resetting the project.
- `npm run start`: launch the Expo development server with interactive Metro tooling.
- `npm run android` / `npm run ios` / `npm run web`: open the dev server directly in an emulator, simulator, or browser.
- `npm run lint`: run ESLint (Expo preset) to catch TypeScript and React Native issues.
- `npm run reset-project`: restore the stock Expo starter under `app/`, preserving the current tree in `app-example/`.

## Coding Style & Naming Conventions
Use TypeScript with strict null checks (see `tsconfig.json`). Prefer function components and React hooks; keep component and screen filenames in `PascalCase` (e.g., `GasStationCard.tsx`), hooks in `camelCase` prefixed with `use`, and co-locate styles via `StyleSheet.create`. Indent with two spaces, keep imports ordered from external packages to local modules, and rely on the `@/` alias instead of long relative paths. Run `npm run lint` before opening a pull request; add inline comments only when logic is non-obvious.

## Testing Guidelines
Automated testing is not yet wired up. When adding tests, set up `jest-expo` with `@testing-library/react-native`, place specs under `__tests__/` adjacent to the code under test, and mirror the module name (`GasStationCard.test.tsx`). Document manual verification steps in pull requests until a CI workflow exists. Aim for broad coverage of user flows and error handling once the testing stack is in place.

## Commit & Pull Request Guidelines
Use short, imperative commit messages (`Add station search filters`) and group related edits together. Reference issue IDs in the subject or body when applicable. Pull requests should include: a concise summary of the change, screenshots or screen recordings for UI updates on both light and dark themes, a list of tests or manual checks performed (e.g., iOS simulator, Android emulator, web), and any follow-up tasks. Tag reviewers familiar with the feature area and wait for lint to pass before requesting review.
