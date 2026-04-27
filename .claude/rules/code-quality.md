# Code Quality

## Linting

All code MUST pass ESLint checks before committing. Run the linter with:

```bash
pnpm lint
```

Do NOT commit code that has any linting errors. Fix all issues before creating a commit.

## Rules Enforced

The project uses the following key lint rules (see `eslint.config.ts` for full config):

- No `console` statements
- No unused variables (`@typescript-eslint/no-unused-vars`)
- No explicit `any` types (`@typescript-eslint/no-explicit-any`)
- Consistent type imports (`@typescript-eslint/consistent-type-imports`)
- React Native specific rules (no color literals, no unused styles, no raw text, sorted styles)
- Prettier formatting enforced
- Single quotes required

## Pre-commit Checklist

Before every commit, ensure:

1. `pnpm lint` passes with zero errors
2. `npx tsc --noEmit` passes with zero errors
3. Commit message follows conventional commit format (see `commit-conventions.md`)
