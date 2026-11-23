# Editor: see your output, clear verdicts, resizable panes, shortcuts, question status (US-5-T-23)

## Test cases panel shows your output after Run
- After Run, the selected case should show "Your output"
- After Run, "Your output" should show what the player's code returned for the selected case
- After Run, "Your output" should come after Expected output
- Before Run, the selected case should not show "Your output"
- After Run, a passed case tab should be in the primary color
- After Run, a failed case tab should be in the danger color
- After Run, the case tabs should not show any icons or dots (their text stays "Case N")
- Before Run, a case tab should be in neither the primary nor the danger color

## Results panel
- After an Accepted Submit, the verdict should be in the primary color
- After a Wrong Answer Submit, the verdict should be in the danger color
- After a Submit, "Passed" should be a label over a bg-raised mono block reading "1 / 3"
- After a failed Submit, "Input" should be a label over a block with the failing case
- After a failed Submit, "Expected" should be a label over a block with the expected value
- After a failed Submit, "Your output" should be a label over a block with the player's output
- The results blocks should use the same bg-raised mono block style as the test cases panel

## Copy
- The test cases panel should say "Expected output", not "Expected Output"
- A problem with no test cases should say "No test cases available for this problem" with no period
- While a question loads, the question panel should say "Loading question…"

## Resizable panes
- The question/code divider should be a separator
- The code/test cases divider should be a separator
- Pressing ArrowRight on the focused question/code divider should widen the question pane
- Pressing ArrowLeft on the focused question/code divider should narrow the question pane
- Pressing ArrowDown on the focused code/test cases divider should make the code pane taller
- Pressing ArrowUp on the focused code/test cases divider should make the code pane shorter
- The question pane should never go below 20% by keyboard
- The question pane should never go above 80% by keyboard
- Dragging the question/code divider should set the question pane to where the mouse is
- Dragging the question/code divider past the edge should stop the question pane at 20%
- Dragging the code/test cases divider should set the code pane to where the mouse is
- Moving the mouse after letting go of a divider should not resize anything

## Shortcuts
- Ctrl+Enter should run the code
- Cmd+Enter should run the code
- Ctrl+Shift+Enter should submit the code
- Ctrl+Enter inside the Monaco editor should run the code
- Ctrl+Shift+Enter inside the Monaco editor should submit the code
- Ctrl+Enter should not run anything in someone else's read-only workspace
- Ctrl+Enter inside Monaco should not run anything in someone else's read-only workspace
- Ctrl+Shift+Enter should not submit while a run is already going

## Question status in the question navigation
- A question that came back Accepted should show its number in the primary color
- A question submitted but not solved should show its number in the muted color
- A question submitted but not solved should show its number underlined
- A question never submitted should not be underlined
- A question solved and then failed again should stay in the primary color
- The open question that has not been solved should not be in the primary color

## Question panel
- Easy should use the primary color
- Medium should use the secondary color
- Hard should use the danger color
- The difficulty should not use hardcoded green, yellow or red
