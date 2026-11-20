# Sprint 4 – Competitive Matches

**End date:** November 18, 2026

---

## Cohesive Gameplay

> As a player, I want the gameplay experience to be cohesive and fair, with a good balance between RNG and player skill.

### Task 1: Rework the ban system to be a team vote

- Each player in a team votes to ban one question.
- Instead of banning every question a player selects, bans work as a team majority vote, with each team banning one question.
- The number of questions left in the pool after bans should be 9, 6 and 3 for 3, 2 and 1 player teams.

**Acceptance criteria**
- On the ban screen, each player can vote for exactly one question to ban, and can change their vote until the ban window closes.
- Each player sees their teammates' votes live; the other team's votes are not shown.
- When the ban window closes, each team bans exactly one question: the one with the most votes from that team.
- Ties are broken by a documented rule (e.g. random choice among the tied questions), and the same rule is used every time.
- A team where nobody voted still bans one question, chosen by the same documented rule.
- After bans, the pool has 9 questions for 3v3, 6 for 2v2 and 3 for 1v1.
- The vote counting happens on the server; a client cannot ban a question directly.

### Task 2: Assign individual questions from the pool instead of the whole pool to each player

- Each player should be working on a different question, so that each player can contribute to the team.
- Each player should be able to pick 3 questions total, for a total of 3, 6 or 9 per team.
- The total question pool for each team should still be the same.
- Requires Task 1, because it changes the number of questions in the pool.

**Acceptance criteria**
- Each player is assigned 3 questions, so a team has 3, 6 or 9 questions for 1, 2 or 3 players.
- No two players on the same team are assigned the same question.
- Both teams work from the same question pool.
- A player's editor only shows the questions assigned to them.
- Players who don't pick before the pick window closes are assigned the remaining questions automatically, still with no duplicates on the team.
- Scoring still counts each question once per team.

### Task 3: More informative Run/Submit results

- Improve the component that shows wrong answer/error output after submitting code.
- Color-separate error/wrong answer from accepted submissions.
- Add a component that shows error output when running code.

**Acceptance criteria**
- After Submit, an accepted submission is shown in one color (e.g. green) and a wrong answer or error in another (e.g. red), with the verdict in words too, so it doesn't rely on color alone.
- A wrong answer shows which test case failed, with the expected and actual output.
- After Run, compile or runtime errors are shown with the error message.
- Long output scrolls instead of stretching the page.

### Story acceptance criteria — Cohesive Gameplay
1. Each team bans one question by majority vote, leaving 9, 6 or 3 questions for 3v3, 2v2 or 1v1.
2. Each player works on their own 3 questions, with no overlap within a team, so every player contributes.
3. Run and Submit results clearly show whether code was accepted, wrong or errored, and why.

---

## Multiple Lobbies

> As a player, I want multiplayer lobbies like Among Us that can be joined with a code, to make playing games with friends easier.

### Task 1: Create a "Host Game" flow that spawns a new lobby and assigns the creator as host {1-2 hours}

- Create a "Host Game" flow that spawns a new lobby and assigns the creator as host (essentially allow multiple lobbies to exist).
- Generate unique, short join codes.
- Ensure code collision handling, and expiry when a lobby closes.

**Acceptance criteria**
- Clicking "Host Game" creates a new lobby and puts the player in it as host.
- The lobby shows a short join code (e.g. 4–6 characters) that is easy to read out loud.
- Two lobbies that are open at the same time never have the same code.
- Several lobbies can run at the same time without affecting each other (ready states, teams, countdowns).
- When a lobby closes, its code stops working and can be reused later.
- If the host leaves, the lobby either passes host to another player or closes (documented rule).

### Task 2: Joining lobbies {3-4 hours}

- Build a "Join with Code" screen with input validation and clear error states (invalid code, lobby full, game already started).
- Support joining via shareable link or deep link (e.g. `game://join/ABCD`).

**Acceptance criteria**
- Entering a valid code on the "Join with Code" screen puts the player in that lobby.
- Badly formatted codes are rejected before sending (wrong length or characters).
- Each error has its own clear message: invalid code, lobby full, and game already started.
- The host can copy a share link, and opening it puts the player in the lobby (after login if needed).
- A logged-out player who opens a share link is sent to log in and then into the lobby.

### Story acceptance criteria — Multiple Lobbies
1. Any player can host their own lobby and gets a unique join code.
2. Friends can join with the code or a share link, and get a clear message if they can't join.
3. Multiple lobbies can run at the same time without interfering with each other.
4. Closed lobbies' codes stop working.

---

## More Fleshed-Out Matchmaking

> As a player, I want skill-based matchmaking because I don't want to play against noobs when I want to play real matches.

### Task 1: Decide what ranking will be used on the ladder {3-4 hours}

- Elo vs. Glicko vs. something else?
- Different leagues?

**Acceptance criteria**
- The team has chosen a rating system and written down why.
- The rules are written down: starting rating, how a win/loss/draw changes it, and how team results apply to each player.
- If there are leagues, their names and rating ranges are written down.

### Task 2: Build a system that automatically creates lobbies to mimic matchmaking {5-6 hours}

- Everyone is auto-readied in this special lobby; players just wait for everyone to be queued.
- Need a queueing system that finds eligible players for a match and groups them by skill level.

**Acceptance criteria**
- A player can join the matchmaking queue for a chosen mode (1v1, 2v2 or 3v3) and leave it at any time.
- The queue only groups players whose ratings are within a set range of each other.
- If no match is found after a set time, the allowed rating range widens so players aren't stuck waiting forever.
- When enough players are found, they are placed in a lobby, readied automatically, and the match starts.
- Teams are balanced so their average ratings are as close as possible.
- A player can't be in the queue and in another lobby at the same time.
- After a ranked match ends, each player's rating is updated using the rules from Task 1.

### Task 3: Overhaul user profiles to show rank/league and be more personalizable {3-4 hours}

- User profiles should have profile icons, rank, description, etc.

**Acceptance criteria**
- A player's profile shows their profile icon, rank/rating, league (if used) and description.
- A player can change their own icon and description; nobody else can.
- Descriptions have a length limit and are shown as plain text (no HTML/script injection).
- Other players can view a player's profile, e.g. from the lobby.

### Story acceptance criteria — More Fleshed-Out Matchmaking
1. Players have a skill rating that updates after every ranked match, using a documented system.
2. Players can queue for a match and are matched with players of similar skill, without waiting forever.
3. Matched players go straight into a match without manually readying.
4. Each player's profile shows their rank and can be personalized with an icon and description.
