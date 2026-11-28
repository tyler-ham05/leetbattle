import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test files share one Postgres database and each resets its schema
		// (test/setup.ts). Run in parallel on an empty database (as in CI), two
		// files create the users table at once and one fails, so run them one at a time.
		fileParallelism: false,
		coverage: {
			provider: 'v8',
			thresholds: {
				lines: 80,
				statements: 80,
				functions: 80,
				branches: 80,
			},
		},
	},
});
