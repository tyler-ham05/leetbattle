import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';

export const submitBodySchema = z.object({
	code: z.string().trim().min(1),
});

export const questionIdParamsSchema = z.object({
	questionId: z.coerce.number().int().min(-2147483648).max(2147483647),
});

const caseSchema = z.object({
	input: z.string(),
	expected: z.string(),
});

export const runBodySchema = z.object({
	code: z.string().trim().min(1),
	cases: z.array(caseSchema),
	questionId: z.coerce.number().int().min(-2147483648).max(2147483647),
});

const PYTHON_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 1_000_000;

interface CaseInput {
	input: string;
	expected: string;
}

export type CaseErrorType = 'timeout' | 'runtime_error' | null;

export interface CaseResult extends CaseInput {
	actual: string | null;
	passed: boolean;
	error: string | null;
	errorType: CaseErrorType;
}

export type Verdict = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';

// Classifies a single case: wrong return value vs. an exception/crash vs.
// a case that hit the per-case timeout.
export function verdictForResult(result: CaseResult): Verdict {
	if (result.passed) return 'Accepted';
	if (result.errorType === 'timeout') return 'Time Limit Exceeded';
	if (result.errorType === 'runtime_error') return 'Runtime Error';
	return 'Wrong Answer';
}

// Classifies the run by its first non-passing case.
export function verdictForResults(results: CaseResult[]): Verdict {
	const firstFailure = results.find((r) => !r.passed);
	return firstFailure ? verdictForResult(firstFailure) : 'Accepted';
}

// DB text columns store literal "\n" (two chars) rather than real newlines,
// since data.sql inserts them as plain (non-E-prefixed) string literals.
export function unescapeNewlines(value: string): string {
	return value.replace(/\\n/g, '\n');
}

export function extractImports(prompt: string): string {
	return prompt
		.split('\n')
		.filter((line) => {
			const trimmed = line.trim();
			return trimmed.startsWith('import ') || trimmed.startsWith('from ');
		})
		.join('\n');
}

// `test` columns are HumanEval/LeetCodeDataset-style `check(candidate)` bodies,
// i.e. a sequence of `assert candidate(<args>) == <expected>` lines.
export function parseCheckCases(test: string): CaseInput[] {
	const cases: CaseInput[] = [];
	const lineRe = /^assert\s+candidate\((.*)\)\s*==\s*(.+)$/;
	for (const rawLine of test.split('\n')) {
		const match = rawLine.trim().match(lineRe);
		if (match) {
			cases.push({ input: match[1], expected: match[2] });
		}
	}
	return cases;
}

export function buildCaseHarness(imports: string, userCode: string, entryPoint: string, testCase: CaseInput): string {
	return [
		imports,
		'import json',
		'',
		userCode,
		'',
		'def _parse_literal(value):',
		'    try:',
		'        return eval(value, {"__builtins__": {}})',
		'    except Exception:',
		'        pass',
		'    try:',
		'        return json.loads(value)',
		'    except Exception:',
		'        return value',
		'',
		`_entry_point_call = ${JSON.stringify(entryPoint)}`,
		`_case = ${JSON.stringify(testCase)}`,
		'try:',
		'    _actual = eval(f"{_entry_point_call}({_case[\'input\']})")',
		'    _expected = _parse_literal(_case["expected"])',
		'    _result = {',
		'        "input": _case["input"],',
		'        "expected": _case["expected"],',
		'        "actual": repr(_actual),',
		'        "passed": _actual == _expected,',
		'        "error": None,',
		'    }',
		'except Exception as e:',
		'    _result = {',
		'        "input": _case["input"],',
		'        "expected": _case["expected"],',
		'        "actual": None,',
		'        "passed": False,',
		'        "error": f"{type(e).__name__}: {e}",',
		'    }',
		'print(json.dumps(_result))',
		'',
	].join('\n');
}

interface PythonRunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	timedOut: boolean;
}

export async function runPython(script: string, timeoutMs = PYTHON_TIMEOUT_MS): Promise<PythonRunResult> {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'coderunner-'));
	const file = path.join(dir, `${randomUUID()}.py`);
	try {
		await writeFile(file, script, 'utf8');
		return await new Promise<PythonRunResult>((resolve) => {
			const proc = spawn('python3', ['-I', file]);
			let stdout = '';
			let stderr = '';
			let timedOut = false;

			const timer = setTimeout(() => {
				timedOut = true;
				proc.kill('SIGKILL');
			}, timeoutMs);

			proc.stdout.on('data', (chunk: Buffer) => {
				if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
			});
			proc.stderr.on('data', (chunk: Buffer) => {
				if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
			});
			proc.on('close', (exitCode) => {
				clearTimeout(timer);
				resolve({ stdout, stderr, exitCode, timedOut });
			});
			proc.on('error', (err) => {
				clearTimeout(timer);
				resolve({ stdout, stderr: String(err), exitCode: null, timedOut });
			});
		});
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

export async function runCase(
	imports: string,
	userCode: string,
	entryPoint: string,
	testCase: CaseInput,
	timeoutMs = PYTHON_TIMEOUT_MS,
): Promise<CaseResult> {
	const script = buildCaseHarness(imports, userCode, entryPoint, testCase);
	const { stdout, stderr, exitCode, timedOut } = await runPython(script, timeoutMs);

	if (timedOut) {
		return { ...testCase, actual: null, passed: false, error: 'time limit exceeded', errorType: 'timeout' };
	}
	if (exitCode !== 0) {
		return {
			...testCase,
			actual: null,
			passed: false,
			error: stderr.trim() || `python exited with code ${exitCode}`,
			errorType: 'runtime_error',
		};
	}
	try {
		const parsed = JSON.parse(stdout.trim()) as Omit<CaseResult, 'errorType'>;
		return { ...parsed, errorType: parsed.error ? 'runtime_error' : null };
	} catch {
		return {
			...testCase,
			actual: null,
			passed: false,
			error: 'failed to parse interpreter output',
			errorType: 'runtime_error',
		};
	}
}

interface RunCasesOptions {
	// When true, keeps running every case even after one fails. Defaults to
	// false (stop at the first failing case) for judged submissions.
	runAll?: boolean;
	timeoutMs?: number;
}

// Runs cases one Python process at a time, in order. By default stops as soon
// as one doesn't pass (wrong answer, exception, or timeout) so later cases
// never run; pass `runAll: true` to run every case regardless.
export async function runCases(
	imports: string,
	userCode: string,
	entryPoint: string,
	cases: CaseInput[],
	options: RunCasesOptions = {},
): Promise<CaseResult[]> {
	const { runAll = false, timeoutMs = PYTHON_TIMEOUT_MS } = options;
	const results: CaseResult[] = [];
	for (const testCase of cases) {
		const result = await runCase(imports, userCode, entryPoint, testCase, timeoutMs);
		results.push(result);
		if (!result.passed && !runAll) break;
	}
	return results;
}
