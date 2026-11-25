# Clear Run/Submit results with each test case's output (US-8-T-3)

## Submit verdict in words and colour (AC1)
- After an Accepted Submit, the result panel should show the words "Accepted"
- After an Accepted Submit, the verdict should be in the primary color
- After a Wrong Answer Submit, the result panel should show the words "Wrong Answer"
- After a Wrong Answer Submit, the verdict should be in the danger (red) color
- After a Runtime Error Submit, the verdict should be in the danger color
- After a Time Limit Exceeded Submit, the verdict should be in the danger color

## A failed Submit says which case failed (AC2)
- After a Wrong Answer Submit that passed 1 of 3, the result panel should say "Failed on case 2 of 3"
- After a Wrong Answer Submit, the "Expected" block should show the failing case's expected output
- After a Wrong Answer Submit, the "Your output" block should show the player's actual output

## Run shows errors in their own block (AC3)
- After Run, a case with a runtime error should show an "Error" block
- After Run, the "Error" block should show the case's full stderr (the traceback)
- After Run, when an errored case's stderr is empty (e.g. Time Limit Exceeded), the "Error" block should show the error message
- After Run, a case with a runtime error should not show "Your output"
- After Run, a case with a runtime error should not show a "Stderr" block (its stderr is already in "Error")
- After a Runtime Error Submit, the result panel should show an "Error" block with the failing case's traceback
- After a Runtime Error Submit, the result panel should not show "Your output"

## Stdout and stderr for each test case (AC4)
- After Run, the selected case should show a "Stdout" block with what the player printed
- After Run, the selected case should show a "Stderr" block with what the player's code wrote to stderr
- After Run, switching to Case 2 should show Case 2's stdout, not Case 1's
- After Run, a case that printed nothing should not show a "Stdout" block
- After Run, a case that wrote nothing to stderr should not show a "Stderr" block
- After Submit, the result panel should show a "Stdout" block for each case that ran
- After a match Submit (through the game socket), the result panel should show the "Stdout" block from the grading

## Output Limit Exceeded (AC6)
- After an Output Limit Exceeded Submit, the result panel should show the words "Output Limit Exceeded"
- After an Output Limit Exceeded Submit, the verdict should be in the danger color
- After Run, a case with "Output Limit Exceeded" should have its tab in the danger color

## Long output scrolls (AC7)
- An output block should have a maximum height
- An output block should scroll vertically inside itself (overflow-y auto)
