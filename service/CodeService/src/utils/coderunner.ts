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
// US-8-T-3: how much a test case may print (stdout and stderr together)
// before it is stopped with Output Limit Exceeded.
export const OUTPUT_LIMIT_BYTES = 64 * 1024;
// The harness's own result line is small; this only guards against a runaway.
const MAX_RESULT_BYTES = 1_000_000;

interface CaseInput {
	input: string;
	expected: string;
}

export type CaseErrorType = 'timeout' | 'output_limit' | 'runtime_error' | null;

export interface CaseResult extends CaseInput {
	actual: string | null;
	passed: boolean;
	error: string | null;
	errorType: CaseErrorType;
	// What the player's code wrote while this case ran (US-8-T-3).
	stdout: string;
	stderr: string;
}

export type Verdict = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Output Limit Exceeded';

// Classifies a single case: wrong return value vs. an exception/crash vs.
// a case that hit the per-case timeout or output limit.
export function verdictForResult(result: CaseResult): Verdict {
	if (result.passed) return 'Accepted';
	if (result.errorType === 'timeout') return 'Time Limit Exceeded';
	if (result.errorType === 'output_limit') return 'Output Limit Exceeded';
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

// The harness hands its result back on file descriptor 3, not stdout, so
// whatever the player prints (stdout) or raises (stderr) is theirs alone and
// can never be mistaken for the result.
//
// The player's code is compiled as "solution.py" (and registered with
// linecache so tracebacks can quote it), and a traceback only shows frames
// from that file: line numbers match the player's own code, and neither the
// server's temp path nor the harness's lines appear (US-8-T-3).
export function buildCaseHarness(imports: string, userCode: string, entryPoint: string, testCase: CaseInput): string {
	return [
		imports,
		'import json',
		'import linecache as _linecache',
		'import os as _os',
		'import traceback as _traceback',
		'',
		`_player_code = ${JSON.stringify(userCode)}`,
		'_linecache.cache["solution.py"] = (len(_player_code), None, _player_code.splitlines(True), "solution.py")',
		'',
		'def _print_player_traceback(e):',
		'    tb = e.__traceback__',
		'    while tb is not None and tb.tb_frame.f_code.co_filename != "solution.py":',
		'        tb = tb.tb_next',
		'    _traceback.print_exception(type(e), e, tb)',
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
		'    exec(compile(_player_code, "solution.py", "exec"), globals())',
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
		'    _print_player_traceback(e)',
		'    _result = {',
		'        "input": _case["input"],',
		'        "expected": _case["expected"],',
		'        "actual": None,',
		'        "passed": False,',
		'        "error": f"{type(e).__name__}: {e}",',
		'    }',
		'with _os.fdopen(3, "w") as _result_pipe:',
		'    _result_pipe.write(json.dumps(_result))',
		'',
	].join('\n');
}

interface PythonRunResult {
	stdout: string;
	stderr: string;
	// What the harness wrote on file descriptor 3 (its JSON result).
	result: string;
	exitCode: number | null;
	timedOut: boolean;
	outputExceeded: boolean;
}

export async function runPython(script: string, timeoutMs = PYTHON_TIMEOUT_MS): Promise<PythonRunResult> {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'coderunner-'));
	const file = path.join(dir, `${randomUUID()}.py`);
	try {
		await writeFile(file, script, 'utf8');
		return await new Promise<PythonRunResult>((resolve) => {
			// stdin, stdout, stderr, and a fourth pipe (fd 3) for the harness's result.
			const proc = spawn('python3', ['-I', file], { stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });
			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];
			const result: Buffer[] = [];
			let outputBytes = 0;
			let resultBytes = 0;
			let timedOut = false;
			let outputExceeded = false;

			const timer = setTimeout(() => {
				timedOut = true;
				proc.kill('SIGKILL');
			}, timeoutMs);

			// stdout and stderr share one budget. The first OUTPUT_LIMIT_BYTES are
			// kept; going past it stops the case.
			const capture = (into: Buffer[]) => (chunk: Buffer) => {
				if (outputExceeded) return;
				const room = OUTPUT_LIMIT_BYTES - outputBytes;
				if (chunk.length > room) {
					into.push(chunk.subarray(0, room));
					outputBytes = OUTPUT_LIMIT_BYTES;
					outputExceeded = true;
					proc.kill('SIGKILL');
					return;
				}
				into.push(chunk);
				outputBytes += chunk.length;
			};
			proc.stdout?.on('data', capture(stdout));
			proc.stderr?.on('data', capture(stderr));
			(proc.stdio[3] as NodeJS.ReadableStream | null)?.on('data', (chunk: Buffer) => {
				if (resultBytes < MAX_RESULT_BYTES) result.push(chunk);
				resultBytes += chunk.length;
			});

			const finish = (exitCode: number | null, extraStderr = '') => {
				clearTimeout(timer);
				resolve({
					stdout: Buffer.concat(stdout).toString(),
					stderr: Buffer.concat(stderr).toString() + extraStderr,
					result: Buffer.concat(result).toString(),
					exitCode,
					timedOut,
					outputExceeded,
				});
			};
			proc.on('close', (exitCode) => finish(exitCode));
			proc.on('error', (err) => finish(null, String(err)));
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
	const { stdout, stderr, result, exitCode, timedOut, outputExceeded } = await runPython(script, timeoutMs);
	const failed = (error: string, errorType: CaseErrorType): CaseResult =>
		({ ...testCase, actual: null, passed: false, error, errorType, stdout, stderr });

	if (outputExceeded) return failed('output limit exceeded', 'output_limit');
	if (timedOut) return failed('time limit exceeded', 'timeout');
	// No result means Python never reached the end of the harness, e.g. the
	// player's code didn't compile; its error is in stderr.
	if (exitCode !== 0 || !result.trim()) {
		return failed(stderr.trim() || `python exited with code ${exitCode}`, 'runtime_error');
	}
	try {
		const parsed = JSON.parse(result) as Omit<CaseResult, 'errorType' | 'stdout' | 'stderr'>;
		return { ...parsed, errorType: parsed.error ? 'runtime_error' : null, stdout, stderr };
	} catch {
		return failed('failed to parse interpreter output', 'runtime_error');
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
