---
id: US-8-T-3
story: US-8
sprint: 4
assignee: asvinod (Ashwin Vinod)
estimate_hours: 4
---

# Show clear Run and Submit results with each test case's output

## Description
Serves US-8, Cohesive Gameplay (#142), through issue #185. After Run or Submit, a player sees clearly whether their code was accepted, wrong or errored, and why. Results show which test case failed, the error message, and what the player's code printed (stdout) and raised (stderr) on each test case. A `print()` in the player's code no longer changes the verdict, and a test case that prints too much gets its own verdict, `Output Limit Exceeded`.

Out of scope: running hidden test cases past the first failure on Submit, separate colours for different kinds of failure (for example an orange "limit exceeded" colour; every failure is red for now), scoring and the match submit lock or cooldown, and changes to how test cases are chosen.

## Specs
- **CodeService** (`service/CodeService/src/utils/coderunner.ts`, `service/CodeService/src/service.ts`)
  - Anything the player's code writes to stdout or stderr is captured per test case. It is kept apart from the harness's own result, so printing can never cause "failed to parse interpreter output".
  - A runtime error's stderr includes the Python traceback of the player's code only. Its frames name the player's file `solution.py`, with line numbers in the player's own code; the server's temporary file path and the harness's own lines are not shown. A compile (syntax) error's stderr includes Python's `SyntaxError` message for `solution.py`.
  - `POST /solution` (Run) returns, for every test case, `{ verdict, expected, response, stdout, stderr }`.
  - `POST /solution/:questionId` (Submit) keeps `{ verdict, passed, total, case, expected, response }` and adds `cases`. `cases` has one `{ verdict, stdout, stderr }` entry for each test case that ran, in order. Submit still stops at the first failing case, so `cases` ends with that case.
  - A test case that times out has verdict `Time Limit Exceeded`. Its stdout and stderr hold whatever was captured before the timeout.
  - A test case whose stdout and stderr together pass 64 KB (65,536 bytes) is stopped and gets verdict `Output Limit Exceeded`, whatever its return value. Its stdout and stderr hold the first 64 KB captured. Output up to 64 KB never changes the verdict.
- **GameService** passes the new Submit fields through to the submitting player unchanged on `game:submit`. Scoring keeps using `verdict`, `passed` and `total`.
- **Frontend**
  - The Submit result (`frontend/app/editor/components/results-panel.tsx`) shows the verdict in words and in colour: `Accepted` in the primary colour, and `Wrong Answer`, `Runtime Error`, `Time Limit Exceeded` and `Output Limit Exceeded` in red.
  - When Submit fails, the result panel says which test case failed ("Failed on case N of M") and shows its input. For a `Wrong Answer` it also shows the expected output and the player's actual output ("Your output").
  - When a test case errors (`Runtime Error`, `Time Limit Exceeded` or `Output Limit Exceeded`), the Run result (`frontend/app/editor/components/test-cases-panel.tsx`) and the Submit result both show an "Error" block instead of "Your output". It holds the case's full stderr (the traceback, plus anything the player wrote to stderr), or the error message when stderr is empty.
  - After Run, each test case's tab shows the player's stdout in a block labelled "Stdout" and their stderr in a block labelled "Stderr". After Submit, the result panel shows the same blocks for each case that ran. A block only appears when its stream has output, and a case that errored shows no "Stderr" block, since its stderr is already in the "Error" block.
  - Output blocks (`frontend/app/editor/components/output-block.tsx`) have a maximum height and scroll inside themselves, so long output never stretches the page.

## Requirements
- Python code still runs one test case per process, with the existing 5-second timeout. The per-test-case output limit is 64 KB, replacing the current ~1 MB cap that silently cuts output off.
- Keep the existing Run and Submit response fields so current callers (the editor, GameService's grading and scoring) keep working. Only add fields.
- No new runtime dependencies.
- Frontend tests use mocked CodeService and game socket responses and never call a backend service.
- Existing CodeService, GameService and frontend tests must keep passing. The one exception is CodeService's `handles TLE` test (`service/CodeService/test/submit.test.ts`): its infinite loop prints, so it would now hit the output limit first. Its loop is changed to not print, so it still tests a pure timeout.

## Acceptance criteria
1. After Submit, an accepted submission and a wrong answer or error are shown in different colours, with the verdict in words too, so the result doesn't rely on colour alone.
2. A wrong answer on Submit shows which test case failed, with its expected and actual output.
3. After Run or Submit, a compile or runtime error is shown in an "Error" block with the traceback of the player's code, which names `solution.py` and doesn't show the server's file paths.
4. After Run or Submit, each test case that ran shows the player's stdout and stderr in separate blocks, and a block only appears when its stream has output.
5. A `print()` in the player's code never changes the verdict while its output stays within the 64 KB limit; a correct solution that prints still passes.
6. A test case whose output passes 64 KB gets the verdict `Output Limit Exceeded`, shown in words and in red.
7. Long output scrolls inside its block instead of stretching the page.
