---
id: US-4-T-2
story: US-4
sprint: 3
assignee: Sree Satya Jayanth Gudapati
estimate_hours: 5
---

# Display Run and Submit results in the editor

## Description
Serves US-4. Sending code to CodeService from the Run and Submit buttons already exists. This task types the Run and Submit responses to match CodeService and displays the results in the editor. The results are the verdict, the number of tests passed out of the total, and, after a failed Submit, the failing test case, the expected value and the response. Out of scope: backend changes (judging, hidden test data, saving submissions) and the team score.

## Specs
Submit should display its result
  - The page displays the response of POST /solution/:questionId, which has { verdict, passed, total, case, expected, response }. Verdict can be either "Accepted", "Wrong Answer", "Runtime Error" or "Time Limit Exceeded".
  - After Submit returns Accepted the page shows "Accepted" between the Monaco editor and the Case 1, Case 2, Case 3 tabs
  - After Submit returns Wrong Answer the page shows "Wrong Answer" between the Monaco editor and the Case 1, Case 2, Case 3 tabs
  - After Submit the page shows the number of tests passed out of the total between the Monaco editor and the Case 1, Case 2, Case 3 tabs
  - After a failed Submit the page shows the failing test case between the Monaco editor and the Case 1, Case 2, Case 3 tabs
  - After a failed Submit the page shows the expected value between the Monaco editor and the Case 1, Case 2, Case 3 tabs
  - After a failed Submit the page shows the users output between the Monaco editor and the Case 1, Case 2, Case 3 tabs
Run should display its result
  - The page displays the response of POST /solution, a list with one { verdict, expected, response } per case. Case N shows the N-th item's verdict.
  - The page shows one verdict for each test case in its respective Case 1, Case 2, Case 3 tab.

## Requirements
- Use only the theme classes defined in docs/frontend/theming.md. No new dependencies.
- The frontend types for the Run and Submit responses in frontend/app/editor/controller.tsx must match what CodeService returns.
- Frontend tests use a mocked fetch and do not touch backend services. The mocked responses contain every field CodeService returns, with realistic values.

## Acceptance criteria
1. After Submit returns Accepted, the page shows "Accepted" between the editor and the Case tabs.
2. After Submit returns Wrong Answer, the page shows "Wrong Answer" between the editor and the Case tabs.
3. After Submit, the page shows the ratio of passed tests out of total tests
4. After a failed Submit, the page shows the case 
5. After a failed Submit, the page shows the expected.
6. After a failed Submit, the page shows the response.
7. After Run, each Case tab shows the verdict for its own case.
