# Testing Scripts

When testing code snippets or features:

1. **Always write a file** instead of inline bash commands
2. Put test scripts in `src/tests/scratch/`
3. Run with `npx tsx src/tests/scratch/filename.ts`

This makes it easy to:
- Fix typos and re-run
- Reference later
- Iterate on the test
