# App Audit Report (Full Project Re-check)

Generated at: 2026-02-21T07:13:00Z

## Automated checks

- ✅ JS/JSX syntax parse: **66 files**, **0 syntax errors**.
- ✅ Web build/export: `npx expo export --platform web` completed successfully.
- ✅ ESLint run: `npm run lint` completed successfully with **0 errors**, **455 warnings**.
- ⚠️ Expo doctor: `npx expo-doctor` blocked by registry/proxy policy (**HTTP 403**).

## Lint overview

- Total files scanned: **66**
- Files with warnings: **49**
- Total lint errors: **0**
- Total lint warnings: **455**

### Top warning rules

| Rule | Count |
|---|---:|
| `no-unused-vars` | 417 |
| `no-console` | 19 |
| `prefer-const` | 18 |
| `eqeqeq` | 1 |

### Top files by warning count

| File | Warnings |
|---|---:|
| `src/screens/Pantry/PantryScreen.js` | 23 |
| `src/screens/Manage/AdminCategories/AdminCategoriesScreen.js` | 20 |
| `src/screens/Home/HomeScreen.js` | 19 |
| `src/screens/DishNomination/DishNominationScreen.js` | 18 |
| `src/screens/Manage/AdminIngredients/AdminIngredientsScreen.js` | 18 |
| `src/screens/Chat/ChatScreen.js` | 17 |
| `src/screens/Manage/AdminSuggestedRecipes/AdminSuggestedRecipesScreen.js` | 16 |
| `src/screens/Account/ContributedDishesScreen.js` | 15 |
| `src/screens/Manage/AdminUsers/AdminUsersScreen.js` | 15 |
| `src/screens/Recipe/CookAI.js` | 15 |

## Functional risk notes (from static review)

- No compile/syntax-breaking issue found in JS/JSX sources.
- Main remaining quality risk is warning debt (especially `no-unused-vars`) that can hide real regressions.
- AI-related fallback handling has been improved in recent commits, but runtime API behavior still depends on valid `EXPO_PUBLIC_*` env vars.

## Suggested next cleanup order

1. Remove/resolve `no-unused-vars` in top 10 warning files.
2. Convert leftover mutable declarations flagged by `prefer-const`.
3. Gate or remove non-critical `console.log` in production paths.
4. Add CI lint gate (error-on-new-warnings strategy) after warning baseline is reduced.
