import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// CodeService test files share one Postgres database and reset its schema.
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
