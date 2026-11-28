# Run/Submit busy feedback (US-10-T-9)

## Run and Submit: busy
- While running, Run should show the word "Running"
- While running, Run should still be named "Run"
- While running, Run should be marked busy (aria-busy)
- While running, Run should have the edge light (class lb-trace)
- While running, Run should show no spinner
- While submitting, Submit should show the word "Judging"
- While submitting, Submit should still be named "Submit"
- While submitting, Submit should have the edge light
- While submitting, Submit should show no spinner
- While submitting, Run should be disabled

## Run and Submit: the result lands on the button
- After a Submit that comes back Accepted, Submit should show "Accepted"
- After a Submit that comes back Accepted, Submit should nod (class lb-nod)
- After a Submit that comes back Accepted, Submit should show a check mark
- After a Submit that comes back Wrong Answer, Submit should show "Wrong"
- After a Submit that comes back Wrong Answer, Submit should shake (class lb-shake)
- After a Submit that comes back Runtime Error, Submit should show "Error"
- After a Run where every case is Accepted, Run should show "Passed"
- After a Run where 2 cases fail, Run should show "2 failed"
- After a Run where 2 cases fail, Run should shake
- While a result is shown, the button should be marked as showing a result (data-result "pass" or "fail")
- 1.5 seconds after the result, Submit should show "Submit" again
- 1.5 seconds after the result, Submit should no longer be marked as showing a result
- Clicking Run while Submit is still showing "Accepted" should start the run straight away
- When the submit request itself fails, Submit should go straight back to "Submit" with no nod or shake

## Motion rules (globals.css)
- lb-trace should have a reduced-motion override
- lb-nod should have a reduced-motion override
- lb-shake on the buttons should use the same keyframes as the wrong-password shake
- The countdown digit should have a reduced-motion override

## Existing tests this task changes
- busy-indicators.test.tsx "shows a spinner in Run while running" becomes "shows Running in Run while running"
- busy-indicators.test.tsx "shows a spinner in Submit while submitting" becomes "shows Judging in Submit while submitting"
- busy-indicators.test.tsx "does not show the word Run while running" now means not the bare word "Run" (it shows "Running")
- busy-indicators.test.tsx "does not show the word Submit while submitting" now means not the bare word "Submit" (it shows "Judging")
- editor.test.tsx (US-4-T-2) "shows Accepted between the editor and the Case tabs" looks for "Accepted" inside the Submission result panel, since the Submit button also says "Accepted" for a moment
