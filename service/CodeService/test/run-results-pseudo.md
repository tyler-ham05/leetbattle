# CodeService: each test case's stdout/stderr, clear errors, Output Limit Exceeded (US-8-T-3)

## Run returns each test case's stdout and stderr (AC4)
- After Run, a solution that calls print("hello") should have "hello" in each case's stdout
- After Run, a solution that writes "careful" to sys.stderr should have "careful" in each case's stderr
- After Run, text the player prints to stdout should not appear in that case's stderr
- After Run, a solution that prints nothing should have an empty stdout for each case

## Submit returns stdout and stderr for each case that ran (AC4)
- After an Accepted Submit, "cases" should have one entry per test case
- After a Wrong Answer Submit, "cases" should have one entry more than "passed" (it stops at the failing case)
- After a Wrong Answer Submit, the last entry in "cases" should have the verdict "Wrong Answer"
- After Submit, a solution that calls print("hello") should have "hello" in the stdout of the first entry in "cases"
- After Submit, the existing fields (verdict, passed, total, case, expected, response) should still be returned

## Printing never changes the verdict under the limit (AC5)
- After Run, a correct solution that calls print() should get "Accepted" on every case
- After Submit, a correct solution that calls print() should get the verdict "Accepted"
- After Submit, a correct solution that prints just under 64 KB should get the verdict "Accepted"

## Errors come back with their message (AC3)
- After Run, code that raises ZeroDivisionError should get the verdict "Runtime Error"
- After Run, code that raises ZeroDivisionError should have "ZeroDivisionError" in the case's response
- After Run, code that raises ZeroDivisionError should have "Traceback" in the case's stderr
- After Run, code with a syntax error should get the verdict "Runtime Error"
- After Run, code with a syntax error should have "SyntaxError" in the case's stderr

## Too much output gets its own verdict (AC6)
- After Run, a solution that prints more than 64 KB should get "Output Limit Exceeded" on that case
- After Submit, a solution that prints more than 64 KB should get the verdict "Output Limit Exceeded"
- After Run, an Output Limit Exceeded case's stdout should be at most 64 KB (65,536 bytes) long

## Timeouts are still Time Limit Exceeded
- (changed from the existing "handles TLE" test) After Submit, an infinite loop that prints nothing should get the verdict "Time Limit Exceeded"
