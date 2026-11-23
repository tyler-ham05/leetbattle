# CodeService — Input/Output Shapes

Routes are defined in `service/CodeService/src/app.ts`, handlers in `service/CodeService/src/service.ts`.

## `GET /`

No input.

```json
{ "service": "code-service", "message": "Hello from code-service" }
```

## `GET /problem/:questionId`

**Params:** `questionId` (number)

**Output:** the full `problems` row, or `404` if no row matches.

```ts
{
  task_id: string;
  question_id: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  problem_description: string;
  starter_code: string;
  estimated_date: string | null;
  prompt: string | null;
  completion: string | null;
  entry_point: string | null;
  test: string | null;
  input_output: unknown | null; // jsonb
  query: string | null;
  response: string | null;
}
```

## `GET /problem?difficulty=Easy&quantity=3`

**Query:** `difficulty` (`'Easy' | 'Medium' | 'Hard'`, default `'Easy'`), `quantity` (number, default `3`)

**Output:** an array of the same row shape as `GET /problem/:questionId`, or `404` if none match.

## `POST /solution`

Runs user code against **caller-supplied** cases (the "Run" button — not a judged submission). Runs every case regardless of earlier failures (`runCases(..., { runAll: true })`).

**Body:**

```ts
{
  code: string;       // non-empty
  questionId: number; // int32, used to look up entry_point/prompt
  cases: { input: string; expected: string }[];
}
```

`input`/`expected` are literal Python source fragments, e.g. `input: "nums = [2,7,11,15], target = 9"`, `expected: "[0,1]"`.

**Output:** `200` with an array, one entry per case in `cases`, in order:

```ts
{
  verdict: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';
  expected: string;          // echoes the case's expected value
  response: string | null;   // error message, or the actual repr() on a wrong answer; null if Accepted
}[]
```

Errors: `400` if `code`/`cases`/`questionId` fail validation, `404` if `questionId` doesn't match a problem.

## `POST /solution/:questionId`

Judged submission. Runs the problem's own hidden test cases (parsed from the `problems.test` column) and stops at the **first** failing case (`runCases` default: `runAll: false`).

**Params:** `questionId` (number)
**Body:**

```ts
{ code: string } // non-empty
```

**Output:** `200` with a single summary object:

```ts
{
  verdict: 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded';
  passed: number;              // cases passed before the run stopped
  total: number;                // total hidden cases for this problem
  case: string | null;          // input of the first failing case; null if Accepted
  expected: string | null;      // expected value of the first failing case; null if Accepted
  response: string | null;      // error message, or actual repr() on a wrong answer; null if Accepted
}
```

Errors: `400` if `code` is missing/empty, `404` if `questionId` doesn't match a problem.

## Shared verdict semantics

Both run and submit endpoints classify each case the same way (`verdictForResult`/`verdictForResults` in `service/CodeService/src/utils/coderunner.ts`):

| Verdict | Meaning |
|---|---|
| `Accepted` | case passed |
| `Wrong Answer` | code ran and returned, but didn't match `expected` |
| `Runtime Error` | code raised an exception, failed to parse/compile (syntax error), or the interpreter output couldn't be parsed |
| `Time Limit Exceeded` | the case didn't finish within the per-case timeout (5s, `PYTHON_TIMEOUT_MS`) |

Each test case is run in its own `python3` subprocess (`runCase`/`buildCaseHarness`), so one case timing out or crashing never affects the result of any other case.
