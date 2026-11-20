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

### Task 2: Sync ready state across the lobby websocket {3-4 hours}

- The server owns the ready state for each player and broadcasts every change to all players.
- If a player switches teams or leaves after readying, reset their ready status.

**Acceptance criteria**
- When a player readies or unreadies, every other player in the lobby sees the change without refreshing.
- A player who switches teams after readying shows as not ready.
- A player who leaves after readying is no longer counted as ready.
- A client cannot set another player's ready status; the server rejects it.

### Task 3: Start the match once everyone is ready {4-5 hours}

- Only start when all players are ready and the teams are full (changed to 1v1, 2v2 and 3v3 options).
- Show a short countdown (~5 seconds) that cancels if anyone unreadies.
- Create a match record in Cloud SQL (match id, teams, problem, start time) and move all players from the lobby to the match screen.
- Do we keep the lobby websocket open for the match or open a new one? (carried over from Sprint 2)

**Acceptance criteria**
- The lobby host can choose 1v1, 2v2 or 3v3, and the team columns allow that many players each.
- The countdown starts only when both teams are full for the chosen size and every player is ready.
- A 5-second countdown is shown to every player in the lobby.
- If any player unreadies, leaves or switches teams during the countdown, it cancels for everyone.
- When the countdown ends, a match record is saved and every player is moved to the match screen.
- The decision on reusing vs. opening a new websocket is recorded (outcome: the match uses its own GameService connection).

### Task 4: Handle disconnects during the countdown and match {2-3 hours}

- How long do we hold a spot for a player to reconnect?
- Does the match continue 3v2 if someone never comes back?

**Acceptance criteria**
- A player who disconnects keeps their spot for 30 seconds (lobby and match).
- A player who reconnects within 30 seconds returns to the same team and the same match screen.
- A player who doesn't return within 30 seconds is removed, and the other players see them as gone.
- The match keeps going with the remaining players (e.g. 3v2) rather than ending.

### Story acceptance criteria — Start Match
1. Players in a lobby can mark themselves ready or unready, and everyone sees each player's status live.
2. A match starts only when both teams are full for the chosen size (1v1, 2v2 or 3v3) and all players are ready, after a 5-second countdown that anyone can cancel by unreadying.
3. When the match starts, a match record is saved and all players land on the match screen together.
4. A player who drops out has 30 seconds to reconnect to their spot; after that the match continues without them.

---

## Collaboration

> As a player, I want to view my teammates' current code so I can understand what they have programmed as a solution, and offer help.

### Task 1: Build a teammate code view {3-4 hours}

- Read-only Monaco editor tabs (or a side panel) for each teammate's code.

**Acceptance criteria**
- During a match, a player can see each teammate's code, labeled with the teammate's name.
- Teammates' code is read-only; typing in it has no effect.
- The view shows nothing from the other team.

### Task 2: Send code changes to teammates in real time {1 day}

- Send the full editor contents on change (debounced ~500ms) vs. sending only the diffs?
- Code must only be sent to your own team. Enforce this on the server, not just in the UI, so the other team can never receive it.

**Acceptance criteria**
- A teammate's edits appear in my view within about a second of them typing.
- The server only sends code to players on the same team; a player on the other team never receives it, even by listening to the socket directly.
- The full-contents vs. diffs decision is recorded.

### Task 3: Save the latest code snapshot for each player {2-3 hours}

So someone who refreshes or reconnects still sees their teammates' code.

**Acceptance criteria**
- The server keeps each player's latest code for each question during the match.
- A player who refreshes or reconnects sees their teammates' latest code immediately, without waiting for the teammates to type again.
- The snapshot only includes the player's own team.

### Task 4: Decide on read-only vs. shared editing {team discussion, 1 hour}

- Read-only for this sprint; live co-editing (Google Docs style) could come later if we have time.

**Acceptance criteria**
- The team has agreed on read-only vs. shared editing, and the decision is written down.
- Outcome: read-only this sprint; live co-editing moved to the backlog.

### Story acceptance criteria — Collaboration
1. During a match, each player can see every teammate's current code, read-only, updating live.
2. The other team can never see your team's code, and this is enforced on the server.
3. After a refresh or reconnect, a player sees their teammates' latest code straight away.

---

## Communication

> As a player, I want to post and read team comments so that we can discuss solutions during the match.

### Task 1: Build the team chat panel UI on the match screen {2-3 hours}

**Acceptance criteria**
- The match screen has a chat panel showing messages with the sender's name.
- A player can type a message and send it with Enter or a Send button.
- New messages appear at the bottom, and the panel scrolls to show them.

### Task 2: Send and receive team messages over the match websocket {3-4 hours}

- Messages are scoped to the team, same rule as code sharing.
- Store messages in the DB with match id, team, player and timestamp.

**Acceptance criteria**
- A message sent by a player appears for all of their teammates without refreshing.
- The other team never receives the message, enforced on the server.
- Each message is saved with its match id, team, player and timestamp.

### Task 3: Load chat history when a player joins or reconnects {1-2 hours}

**Acceptance criteria**
- A player who joins late, refreshes or reconnects sees the team's earlier messages for this match, in order.
- History only includes the player's own team's messages.

### Task 4: Basic safeguards {1-2 hours}

- Message length limit and rate limiting to prevent spam.
- Escape message text so nobody can inject HTML / scripts into the chat.
- Remove entries x days old from the chats DB.

**Acceptance criteria**
- Messages over 500 characters are rejected with an error.
- A player who sends more than one message per second is told to slow down, and the extra message is not sent.
- A message containing HTML or a script tag is shown as plain text and never runs.
- Messages older than 10 days are deleted from the database.

### Story acceptance criteria — Communication
1. During a match, players can send and read messages in a team-only chat, live.
2. The other team never sees your team's messages.
3. A player who joins late or reconnects sees the team's earlier messages.
4. Chat is protected against spam (500-character limit, 1 message per second) and against HTML/script injection, and old messages are cleaned up after 10 days.

---

## Team Score

> As a player, I want to see the score updated during the match so I can track how we are doing.

### Task 1: Define the scoring rules {team meeting, 1-2 hours}

- Points per test case passed, or only for fully correct solutions?
- Is the team score the best submission per problem, or the sum of every member's submissions?
- Do we add a time bonus or a penalty for wrong submissions?
- How does a match end (timer runs out, or first team to solve everything)?

**Acceptance criteria**
- Each question above has an agreed answer, written down where the whole team can see it.
- Outcome: points are based on the share of test cases passed and the problem's difficulty; each team gets its best score per problem (resubmitting for fewer points changes nothing); the match ends when the timer runs out or a team solves every problem.

### Task 2: Connect judge results to scoring {3-4 hours}

- Display Run and Submit button results in the editor (actual scoring out of scope for this specific task).

**Acceptance criteria**
- Clicking Run shows the result in the editor (passed/failed test cases and any error output).
- Clicking Submit shows the verdict and how many test cases passed.
- Errors (e.g. the judge being unavailable) show a readable message instead of nothing.

### Task 3: Push score updates live to all six players over the websocket {2-3 hours}

**Acceptance criteria**
- When a submission changes a team's score, every player in the match sees the new score without refreshing.
- A player who reconnects sees the current scores.

### Task 4: Build the scoreboard UI {2-3 hours}

- Both team scores, the match timer, and recent submissions.

**Acceptance criteria**
- The scoreboard shows both team scores and the time left, counting down.
- Recent submissions are listed.
- The scoreboard stays visible while players are coding.

### Task 5: Build an end-of-match screen {2-3 hours}

Showing the winner and final scores.

**Acceptance criteria**
- When the match ends, every player is taken to a result screen.
- The screen shows Victory or Defeat (or a draw) from the player's point of view, plus both teams' final scores.
- The player can get back to the home screen or lobby from it.

### Task 6: Connect judge results to live scoring

Previous implementation of Run and Submit used dummy requests just to set up the frontend results display.

**Acceptance criteria**
- Run and Submit use the real CodeService judge, not dummy responses.
- A graded submission updates the team's score using the agreed scoring rules.
- Each submission is saved (player, problem, tests passed, points awarded).

### Story acceptance criteria — Team Score
1. Scoring rules are agreed and documented.
2. Submitting real code is graded by the judge, and the team's score updates live for all players.
3. The scoreboard shows both scores and the time left throughout the match.
4. When the match ends, every player sees the winner and the final scores.

---

## UI/UX

> As a player, I want every page to look consistent, load smoothly and be easy to get around so that the app feels like one game and I never get stuck on a page.

### Task 1: Page loading animations {3-4 hours} — Done (PR #62)

- Katana slice on Home, team clash on Lobby, type wipe on Practice, Sign in and Settings.
- Plays on every page load; skipped when reduced motion is on.

**Acceptance criteria**
- Each page plays its loading animation when it loads.
- With the system's reduced motion setting on, no loading animation plays.

### Task 2: Navigation from every page {1-2 hours} — Done (PR #62)

- Shared top bar on Practice, Settings and Sign in, which had no way back home.

**Acceptance criteria**
- Practice, Settings and Sign in all show the shared top bar.
- From every page, a player can get back to Home in one click.

### Task 3: Three-line menu and accessibility {2-3 hours} — Done (PR #62)

- ☰ menu with Home, Practice, Lobby, Settings, Log out.
- Screen reader labels, Esc to close, keyboard focus on the home link.

**Acceptance criteria**
- The ☰ menu opens and lists Home, Practice, Lobby, Settings and Log out.
- Pressing Esc closes the menu.
- When the menu opens, keyboard focus moves to the Home link.
- The menu button and links have screen reader labels.

### Task 4: Interactive home background {2-3 hours} — Done (PR #64)

- The cursor knocks snippets away and they stay where they land.
- Remove the 01/02/03 labels from the menu.

**Acceptance criteria**
- Moving the cursor into a code snippet pushes it away, and it stays where it lands.
- The 01/02/03 labels no longer appear in the menu.

### Task 5: Keep the frontend CI check green {1 hour} — Done (PR #63)

- Branch coverage dropped under 80% once the lobby page was counted; brought back to about 83%.

**Acceptance criteria**
- The frontend CI check passes on `main`.
- Branch coverage is at or above 80%.

### Task 6: Title-screen home menu {3-4 hours} — In review

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

### Task 1: Initialize GameService database {2-3 hours}

Set up the database GameService uses. Initial schema and setup steps are {}.

**Acceptance criteria**
- The GameService schema creates the tables it needs (games, players, submissions, chat).
- Running the setup steps on an empty database works, and running them twice does no harm.
- GameService starts and connects to the database locally.

### Task 2: Create screen to pick questions {}

- Show all nine match questions and let each player select up to three.
- Send selections over the WebSocket and track them in a map on the backend.
- When another player selects a question, {}.

**Acceptance criteria**
- The pick screen shows all nine match questions.
- A player can select up to three questions and cannot select a fourth.
- Selections are sent to the server and kept per player.
- When a teammate selects a question, the other players on the team see it live.
- Players who haven't picked when the 30-second window ends are assigned questions automatically.

### Task 3: Maintain game timer {}

- Track the time remaining and end the match when the timer expires.
- The timer starts when {} and runs for {}.

**Acceptance criteria**
- The timer is kept on the server, so refreshing doesn't reset it.
- The match lasts 20 minutes once play starts.
- Every player sees the same time remaining.
- When the timer reaches zero, the match ends and the higher score wins (equal scores are a draw).

### Task 4: Writing and saving code {}

- Save each player's code per question on the server over the WebSocket and keep a local copy.
- Restore saved code after a refresh or reconnect. Use the local copy if the two versions differ.

**Acceptance criteria**
- A player's code is saved on the server, separately for each question.
- After a refresh or reconnect, the player's code for each question is restored.
- If the local copy and the server copy differ, the local copy is used.

### Task 5: Calculate Points {}

- Route in-match Run requests through GameService, which calls CodeService to execute the code.
- Update the score based on how many test cases pass and return the execution result to the player.

**Acceptance criteria**
- In-match submissions go through GameService, which calls CodeService.
- The player gets the execution result back (verdict and test cases passed).
- The team's score is updated based on test cases passed, and only the team's best score per problem counts.
- A team must wait 5 seconds between submissions.
- If a team solves every problem, the match ends and that team wins.

### Task 6: Connect GameService and add WebSockets {}

- Connect GameService and set up WebSocket support for live match interactions.
- Service connections and WebSocket events are {}.

**Acceptance criteria**
- The lobby starts a game in GameService when the countdown ends.
- Players connect to GameService over a WebSocket, and only logged-in players in that match can join.
- Match updates (phase, timer, scores, player connections) are sent to every player in the match.

### Task 7: Connect the ban screen to GameService {}

- Load the match's nine questions and existing bans, send new bans, and show other players' bans live.
- Connect the lobby → ban screen → editor flow. Depends on issue #90.

**Acceptance criteria**
- The ban screen loads the match's questions and any bans already made.
- A player's ban is sent to the server, and every player sees it live.
- After the 30-second ban window, play continues with the bans made so far.
- Players move from lobby → ban screen → pick screen → editor without refreshing.

### Task 8: Add a Rejoin Match button {}

- Have the active-match endpoint return the WebSocket URL and the information needed to open the game route.
- Check for a rejoinable match in the background on initial load and when the player navigates between pages.
- Show Rejoin Match when the player can return to an active match without needing to know its URL.

**Acceptance criteria**
- The active-match endpoint returns everything needed to reopen the match (WebSocket URL and game route info), or nothing if there is no active match.
- The check runs on first load and whenever the player moves between pages.
- Rejoin Match shows only when the player has a match they can return to.
- Clicking Rejoin Match puts the player back in their match, on their team, with their code restored.

### Story acceptance criteria — In-Game
1. When a lobby starts, all players move through ban → pick → coding without refreshing.
2. Players can ban questions and pick up to three questions, and see their team's choices live.
3. The match runs on a 20-minute server-side timer and ends when time runs out or a team solves every problem.
4. Submitting code is graded by the judge and updates the team's score.
5. A player who refreshes or disconnects can rejoin the match through the Rejoin Match button and pick up where they left off, with their code restored.
