# Commit Conventions

## Conventional Commits

All commits MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Format: `<type>(<scope>): <description>`

Allowed types:
- `feat` – A new feature
- `fix` – A bug fix
- `docs` – Documentation only changes
- `style` – Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor` – A code change that neither fixes a bug nor adds a feature
- `perf` – A code change that improves performance
- `test` – Adding missing tests or correcting existing tests
- `build` – Changes that affect the build system or external dependencies
- `ci` – Changes to CI configuration files and scripts
- `chore` – Other changes that don't modify src or test files
- `revert` – Reverts a previous commit

## Language

All commit messages MUST be written in **English**. Do not use any other language in commit messages.

## Examples

```
feat(education): add course schedule parser
fix(cas): resolve login timeout issue
docs: update README with build instructions
ci: add iOS build workflow
```
