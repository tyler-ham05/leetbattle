# Sprint 3 – Competitive Matches

**End date:** November 18, 2026

---

## Start Match

> As a player in a lobby, I want to be able to mark myself as ready so everyone knows I am ready to start.

### Task 1: Add a ready / unready toggle to the lobby UI {1-2 hours}

Show each player's ready status next to their name in the team columns.

**Acceptance criteria**
- Each player in the lobby sees a single toggle that switches between Ready and Unready.
- Every player's ready status appears next to their name in their team's column.
- The toggle reflects the player's current status after a page refresh.

### Task 2: Sync ready state across the lobby websocket {2 hours}

- LobbyService is the single source of truth for each player's ready state and broadcasts every change to all players in the lobby.
- If a player leaves after readying, reset their ready status. If a readied player's team switch is rejected, keep their ready status.
- Works for every lobby size (1v1, 2v2 and 3v3).

**Acceptance criteria**
- When a player readies or unreadies, every other player in the lobby sees the change without refreshing.
- A player who leaves after readying is no longer counted as ready.
- A readied player whose team switch is rejected stays ready.
- A client cannot set another player's ready status; the server rejects it.
- This works the same in 1v1, 2v2 and 3v3 lobbies.

### Task 3: Start the match once everyone is ready {2-4 hours}

- Create GameService, which manages game state.
- Only start when all players are ready and the teams are full (1v1, 2v2 or 3v3).
- Show a short countdown (~5 seconds) that cancels if anyone unreadies.
- Create a match record and move all players from the lobby to the match screen.

**Acceptance criteria**
- The countdown starts only when both teams are full for the lobby's size and every player is ready.
- A 5-second countdown is shown to every player in the lobby.
- If any player unreadies or leaves during the countdown, it cancels for everyone.
- When the countdown ends, GameService creates the game and every player is moved to the match screen.

### Story acceptance criteria — Start Match
1. Players in a lobby can mark themselves ready or unready, and everyone sees each player's status live.
2. A match starts only when both teams are full for the lobby's size (1v1, 2v2 or 3v3) and all players are ready, after a 5-second countdown that anyone can cancel by unreadying.
3. When the match starts, GameService creates the game and all players land on the match screen together.

---

## Collaboration

> As a player, I want to view my teammates' current code so I can understand what they have programmed as a solution, and offer help.

### Task 1: Build a teammate code view {3 hours}

- Teammates' code is shown in tabs in the match editor.

**Acceptance criteria**
- During a match, a player can see each teammate's code in its own tab, labeled with the teammate's name.
- Teammates' code is read-only; typing in it has no effect.
- The view shows nothing from the other team.

### Task 2: Send code changes to teammates in real time {8 hours}

- Each player's code is passed on to their teammates as they write it.
- Code must only be sent to your own team. Enforce this on the server, not just in the UI, so the other team can never receive it.
- Each player keeps their own editor (read-only for this sprint), so teammates only receive the code to view it.

**Acceptance criteria**
- A teammate's edits appear in my view within about a second of them typing.
- The server only sends code to players on the same team; a player on the other team never receives it, even by listening to the socket directly.

### Story acceptance criteria — Collaboration
1. During a match, each player can see every teammate's current code, read-only, updating live.
2. The other team can never see your team's code, and this is enforced on the server.

---

## Communication

> As a player, I want to post and read team comments so that we can discuss solutions during the match.

### Task 1: Build the team chat panel UI on the match screen {2-3 hours}

- The chat panel sits under the question on the match screen.

**Acceptance criteria**
- The match screen has a chat panel under the question, showing messages with the sender's name.
- A player can type a message and send it with Enter or a Send button.
- New messages appear at the bottom, and the panel scrolls to show them.

### Task 2: Send and receive team messages over the match websocket {4 hours}

- Messages are scoped to the team, same rule as code sharing.
- Send each message over the GameService websocket and save it in the GameService database.

**Acceptance criteria**
- A message sent by a player appears for all of their teammates without refreshing.
- The other team never receives the message, enforced on the server.
- Each message is saved in the GameService database with its match, team, player and timestamp.

### Task 3: Basic safeguards {3 hours}

- Message length limit and rate limiting to prevent spam.
- Remove old messages from the database.
- Chat errors should go away instead of staying on screen for the rest of the match.
- Injection is already prevented (React escapes HTML, and queries are parameterized).

**Acceptance criteria**
- Messages over 500 characters are rejected with an error.
- A player who sends more than one message per second is told to slow down, and the extra message is not sent.
- Messages older than 10 days are deleted from the database.
- A chat error disappears after a short time.
- A message containing HTML or a script tag is shown as plain text and never runs.

### Story acceptance criteria — Communication
1. During a match, players can send and read messages in a team-only chat, live.
2. The other team never sees your team's messages.
3. Chat is protected against spam (500-character limit, 1 message per second) and against HTML/script injection, and old messages are cleaned up after 10 days.

---

## Team Score

> As a player, I want to see the score updated during the match so I can track how we are doing.

### Task 1: Display Run and Submit results in the editor {5 hours}

- Run and Submit already send code to CodeService. Type their responses to match CodeService and display the results in the editor.
- Backend changes (judging, scoring) are out of scope for this task.

**Acceptance criteria**
- Clicking Run or Submit shows the verdict and the number of tests passed out of the total.
- After a failed Submit, the failing test case, the expected value and the actual response are shown.
- Errors (e.g. the judge being unavailable) show a readable message instead of nothing.

### Task 2: Build the scoreboard UI {2-3 hours}

- A scoreboard strip under the top bar with both team scores, the match timer, and the most recent submissions.

**Acceptance criteria**
- The scoreboard shows both team scores and the time left, counting down.
- The most recent submissions are listed.
- The scoreboard stays visible while players are coding.

### Task 3: Build an end-of-match screen {2-3 hours}

- A `/results` screen showing who won and the final scores.

**Acceptance criteria**
- When the match ends, every player is taken to the result screen.
- The screen shows the winning team and both teams' final scores.
- The player can get back to the home screen or lobby from it.

### Story acceptance criteria — Team Score
1. Run and Submit results, including failed test cases, are shown clearly in the editor.
2. The scoreboard shows both scores and the time left throughout the match.
3. When the match ends, every player sees the winner and the final scores.

---

## UI/UX

> As a player, I want every page to look consistent, load smoothly and be easy to get around so that the app feels like one game and I never get stuck on a page.

### Task 1: Page loading animations {3-4 hours}

- Katana slice on Home, team clash on Lobby, type wipe on Practice, Sign in and Settings.
- Plays on every page load; skipped when reduced motion is on.

**Acceptance criteria**
- Each page plays its loading animation when it loads.
- With the system's reduced motion setting on, no loading animation plays.

### Task 2: Navigation from every page {1-2 hours}

- Shared top bar on Practice, Settings and Sign in, which had no way back home.

**Acceptance criteria**
- Practice, Settings and Sign in all show the shared top bar.
- From every page, a player can get back to Home in one click.

### Task 3: Three-line menu and accessibility {2-3 hours}

- ☰ menu with Home, Practice, Lobby, Settings, Log out.
- Screen reader labels, Esc to close, keyboard focus on the home link.

**Acceptance criteria**
- The ☰ menu opens and lists Home, Practice, Lobby, Settings and Log out.
- Pressing Esc closes the menu.
- When the menu opens, keyboard focus moves to the Home link.
- The menu button and links have screen reader labels.

### Task 4: Interactive home background {2-3 hours}

- The cursor knocks snippets away and they stay where they land.
- Remove the 01/02/03 labels from the menu.

**Acceptance criteria**
- Moving the cursor into a code snippet pushes it away, and it stays where it lands.
- The 01/02/03 labels no longer appear in the menu.

### Task 5: Keep the frontend CI check green {1 hour}

- Branch coverage dropped under 80% once the lobby page was counted; brought back to about 83%.

**Acceptance criteria**
- The frontend CI check passes on `main`.
- Branch coverage is at or above 80%.

### Task 6: Title-screen home menu {3-4 hours}

- Replaces the scroll wheel: player name, big title, stacked menu, arrow keys and Enter.

**Acceptance criteria**
- The home screen shows the player's name, the game title and a stacked menu.
- Arrow keys move between menu items, and Enter opens the selected one.
- The old scroll wheel menu is gone.

### Story acceptance criteria — UI/UX
1. Every page shares the same look and navigation, and a player can always get back to Home.
2. Pages load with an animation that respects the reduced motion setting.
3. The main menu works with mouse, keyboard and screen reader.
4. The frontend CI check stays green, with branch coverage at 80% or higher.

---

## In-Game

> As a player, I want to go from the lobby into a timed coding match where I can ban questions, write and run code, and see the score, so I can compete and pick up where I left off if I disconnect.

### Task 1: Connect GameService and add WebSockets {1-2 hours}

- Connect GameService and set up WebSocket support for live match interactions.

**Acceptance criteria**
- The lobby starts a game in GameService when the countdown ends.
- Players connect to GameService over a WebSocket, and only logged-in players in that match can join.
- Match updates (phase, timer, scores, player connections) are sent to every player in the match.

### Task 2: Connect the ban screen to GameService {4-5 hours}

- Before the match clock starts, every player bans one of the match's nine questions, and the match is played on the ones left.
- Replace the ban screen's sample questions with the real ban phase in GameService.

**Acceptance criteria**
- The ban screen loads the match's nine questions and any bans already made.
- Each player can ban one question, the ban is sent to the server, and every player sees it live.
- After the 30-second ban window, play continues with the bans made so far.
- The match is played on the questions that weren't banned.

### Task 3: Create screen to pick questions {2 hours}

- After the bans, teams pick the questions they're working on.

**Acceptance criteria**
- The pick screen shows the questions left after the bans.
- A player can select up to three questions and cannot select a fourth.
- Selections are sent to the server and kept per player.
- Players who haven't picked when the 30-second window ends are assigned questions automatically.

### Task 4: Calculate Points {1 hour}

- Score each submission on the percentage of test cases passed.

**Acceptance criteria**
- The points for a submission are based on the share of test cases it passes.
- Only the team's best score on each problem counts; resubmitting for fewer points changes nothing.
- The team's score updates for every player in the match.

### Task 5: Add a Rejoin Match button {4 hours}

- Have the active-match endpoint return the WebSocket URL and the information needed to open the game route.
- Check for a rejoinable match in the background on initial load and when the player navigates between pages.
- Show Rejoin Match when the player can return to an active match without needing to know its URL.

**Acceptance criteria**
- The active-match endpoint returns everything needed to reopen the match (WebSocket URL and game route info), or nothing if there is no active match.
- The check runs on first load and whenever the player moves between pages.
- Rejoin Match shows only when the player has a match they can return to.
- Clicking Rejoin Match puts the player back in their match through the existing game screen.

### Story acceptance criteria — In-Game
1. When a lobby starts, all players move through ban → pick → coding without refreshing.
2. Players can ban questions and pick up to three questions.
3. Submitting code is scored on the share of test cases passed, and the team's score updates.
4. A player who refreshes or disconnects can get back into the match through the Rejoin Match button.
