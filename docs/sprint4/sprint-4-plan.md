# Sprint 4 – Competitive Matches

**End date:** December 2, 2026

---

## More Fleshed-Out Matchmaking

> As a player, I want skill-based matchmaking because I don't want to play against noobs when I want to play real matches.

### Task 1: Decide what ranking will be used on the ladder {3-4 hours}

- Elo vs. Glicko vs. something else?
- Different leagues?

**Acceptance criteria**
- The team has chosen a rating system and written down why.
- The rules are written down: starting rating, how a win, loss or draw changes it, and how a team result applies to each player.
- If there are leagues, their names and rating ranges are written down.

### Task 2: Build a matchmaking system {2-3 hours}

- Build a queue where players can join and wait to be paired with a team / against an opponent. At first this is first-come, first-served; it is adjusted once the rank system is in (Task 4).
- The game starts when enough players have joined.
- Built as a new service, QueueService, separate from LobbyService and GameService.
- There is no lobby and no readying up; readying up only applies to lobbies.

**Acceptance criteria**
- A player can join the queue for a chosen mode (1v1, 2v2 or 3v3) and leave it at any time.
- QueueService runs as its own service, and players join and leave the queue through it.
- When enough players are queued for a mode, QueueService puts them into teams and starts the match in GameService directly.
- Players are matched in the order they joined the queue.
- A player can't be in the queue and in a lobby at the same time; QueueService and LobbyService agree on this.
- A player who disconnects while queued is removed from the queue.

### Task 3: Build a party system {3-4 hours}

- Players can queue up in groups and join the same team.
- Update the queue to handle parties of players instead of individual players.

**Acceptance criteria**
- A player can invite friends to a party, and they can accept or decline.
- The party leader can queue the whole party, and everyone in the party ends up on the same team.
- A party can't queue for a mode with smaller teams than the party (e.g. a party of 3 can't queue for 2v2).
- If a party member leaves or disconnects, the party is taken out of the queue.

### Task 4: Implement the ladder system

- The queue should match players of similar skill (using the rating from Task 1).
- How should parties affect this matchmaking?

**Acceptance criteria**
- The queue only matches players and parties whose ratings are within a set range of each other.
- If no match is found after a set time, the allowed range widens so players aren't stuck waiting forever.
- Teams are balanced so their average ratings are as close as possible.
- A party's rating for matchmaking is worked out by a written-down rule (e.g. the average, or weighted toward the highest player).
- After a ranked match ends, each player's rating is updated using the rules from Task 1.

### Task 5: Overhaul user profiles to show rank/league and be more personalizable {3-4 hours}

- User profiles should have profile icons, rank, description, etc.

**Acceptance criteria**
- A player's profile shows their profile icon, rank/rating, league (if used) and description.
- A player can change their own icon and description; nobody else can.
- Descriptions have a length limit and are shown as plain text (no HTML/script injection).
- Other players can view a player's profile, e.g. from the lobby or the match result screen.

### Story acceptance criteria — More Fleshed-Out Matchmaking
1. Players have a skill rating that updates after every ranked match, using a documented system.
2. Players can queue alone or as a party and are matched with players of similar skill, without waiting forever.
3. Matched players go straight from the queue into a match.
4. Each player's profile shows their rank and can be personalized with an icon and description.

---

## Cohesive Gameplay

> As a player, I want the gameplay experience to be cohesive and fair, with a good balance between RNG and player skill.

### Task 1: Rework the ban system to be a team vote

- Each player in a team votes to ban one question.
- Instead of banning every question a player selects, bans work as a team majority vote, with each team banning one question.
- The number of questions left in the pool should be 9, 6 and 3 for 3, 2 and 1 player teams.

**Acceptance criteria**
- On the ban screen, each player can vote for exactly one question to ban, and can change their vote until the ban window closes.
- Each player sees their teammates' votes live; the other team's votes are not shown.
- When the ban window closes, each team bans exactly one question: the one with the most votes from that team.
- Ties, and teams where nobody voted, are settled by one written-down rule (e.g. a random choice among the tied questions).
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
- Show each test case's stdout (anything the player prints) and stderr (errors and tracebacks).

**Acceptance criteria**
- After Submit, an accepted submission and a wrong answer or error are shown in different colors, with the verdict in words too, so it doesn't rely on color alone.
- A wrong answer shows which test case failed, with the expected and actual output.
- After Run, compile or runtime errors are shown with the error message.
- After Run or Submit, each test case shows the player's stdout and stderr separately.
- A `print()` in the player's code never changes the verdict; a correct solution that prints still passes.
- Long output scrolls instead of stretching the page.

### Story acceptance criteria — Cohesive Gameplay
1. Each team bans one question by majority vote, leaving 9, 6 or 3 questions for 3v3, 2v2 or 1v1.
2. Each player works on their own 3 questions, with no overlap within a team, so every player contributes.
3. Run and Submit results clearly show whether code was accepted, wrong or errored, and why.

---

## Multiple Lobbies

> As a player, I want multiplayer lobbies like Among Us that can be joined with a code, to make playing games with friends easier.

### Task 1: Create a "Host Game" flow that spawns a new lobby and assigns the creator as host {1-2 hours}

- Create a "Host Game" flow that spawns a new lobby and assigns the creator as host.
- Generate unique, short join codes.
- Ensure code collision handling, and expiry when a lobby closes.

**Acceptance criteria**
- Clicking "Host Game" creates a new lobby and puts the player in it as host.
- The lobby shows a short join code (e.g. 4–6 characters) that is easy to read out loud.
- Two lobbies that are open at the same time never have the same code.
- Several lobbies can run at the same time without affecting each other (ready states, teams, countdowns).
- When a lobby closes, its code stops working and can be reused later.
- If the host leaves, the lobby either passes host to another player or closes, following a written-down rule.

### Task 2: Joining lobbies {3-4 hours}

- Build a "Join with Code" screen with input validation and clear error states (invalid code, lobby full, game already started).
- Support joining via shareable link or deep link (e.g. `game://join/ABCD`).

**Acceptance criteria**
- Entering a valid code on the "Join with Code" screen puts the player in that lobby.
- Badly formatted codes are rejected before sending (wrong length or characters).
- Each error has its own clear message: invalid code, lobby full, and game already started.
- The host can copy a share link, and opening it puts the player in the lobby.
- A logged-out player who opens a share link is sent to log in and then into the lobby.

### Task 3: Make lobbies public {3-4 hours}

- Players creating games can also make the lobby public, so that anyone can join (lower priority).

**Acceptance criteria**
- When hosting, the player can choose whether the lobby is public or private; private is the default.
- Players can see a list of open public lobbies with how many seats are left, and join one with one click.
- Private lobbies never appear in the list and can only be joined with their code or link.
- Full lobbies and lobbies whose match has started are not listed.

### Story acceptance criteria — Multiple Lobbies
1. Any player can host their own lobby and gets a unique join code.
2. Friends can join with the code or a share link, and get a clear message if they can't join.
3. Multiple lobbies can run at the same time without interfering with each other.
4. Hosts can make their lobby public so anyone can find and join it.

---

## Polished Match Experience

> As a player, I want the lobby, match and result screens to be clear, responsive and satisfying, so that every game feels smooth from joining to the final score.

### Task 1: Cleaner match screens {5 hours} (tracked as US-5-T-22)

- Your team first in the lobby and pre-match rosters.
- Ban and pick screens without dots or pills; a ban strikes through its card.
- Match clock turns red under one minute, and remove leftover copy and unused code.

**Acceptance criteria**
- A team b player sees "Your team" on the left in the primary color in the lobby and on the pre-match game page.
- The ban and pick screens show no dots, pips or pill chips.
- A ban strikes through its card as it lands.
- The pre-match header shows no score.
- The match clock is red under one minute.
- Single-line copy has no trailing periods, and the home menu doesn't mention six players.

### Task 2: Editor improvements {5 hours} (tracked as US-5-T-23)

- Show the player's output after Run, with color-separated Accepted vs. failed results.
- Resizable panes and Ctrl/Cmd+Enter shortcuts with hints on hover.
- Solved questions marked in the question navigation, and results kept per question.

**Acceptance criteria**
- After Run, the selected case shows the player's output.
- Accepted is shown in the primary color and other verdicts in the danger color.
- Both dividers resize their panes by mouse and by keyboard.
- Ctrl/Cmd+Enter runs and Ctrl/Cmd+Shift+Enter submits, and hovering Run or Submit shows the shortcut.
- Solved questions are marked in the question navigation.
- Switching questions never shows another question's Run or Submit result.

### Task 3: Team chat follows new messages {2 hours} (tracked as US-3-T-5)

- Chat scrolls to the newest message, with a "New messages" button when scrolled up.
- The player's own messages are labeled "You".

**Acceptance criteria**
- A new message at the bottom of the list scrolls into view.
- A player who has scrolled up isn't moved, and sees a "New messages" button that takes them to the newest message.
- The player's own messages are labeled "You".

### Task 4: Live score feed and result breakdown {4 hours} (tracked as US-4-T-6)

- Scores count up when they change, and a short line says which team solved which question.
- Solving a question first plays the katana slice.
- The result screen lists every question and which team solved it.

**Acceptance criteria**
- A score change bumps the score, and the top bar score counts up to the new value.
- A new solve shows "<Team> solved Q<n>" for 4 seconds.
- Solving a question before the rival team plays the katana slice with "Q<n> / Solved first".
- The result screen lists every question and which teams solved it.

### Task 5: Fix the final score missing the last solve {2 hours} (tracked as US-4-T-7)

- When a team solves the last question, every player gets the final score before the match ends.
- The result screen shows the full score and every solved question.

**Acceptance criteria**
- Solving the last question sends every player the updated score, including that question's points, before the match ends.
- That update lists the last question as solved for the team.
- The result screen shows the full final score and every solved question.

### Task 6: Teammate presence {3 hours} (tracked as US-6-T-13)

- Each teammate's tab shows which question they are working on.
- Opening a teammate's workspace opens it on that question.

**Acceptance criteria**
- A teammate who edits question 2 shows "Q2" on their tab.
- A teammate who hasn't edited anything shows no question.
- Opening a teammate's workspace opens it on the question they are working on.

### Task 7: Lobby slide to ready, one-step join, seats that stay put {4-5 hours} (tracked as US-4-T-9)

- Ready up with a slider (drag or two-finger swipe) that never swipes the page back.
- Clicking an open seat joins the lobby and takes that seat; Quick join picks the emptier team.
- Ready up also works with the spacebar and the right/left arrow keys.

**Acceptance criteria**
- Sliding to the end readies the player, sliding back unreadies them, and the spacebar and arrow keys work too.
- A two-finger sideways swipe over the slider moves it and never goes back a page.
- Clicking an open seat before joining joins the lobby and takes that seat. Quick join seats the player on the emptier team.
- Switching teams moves the player's row to the other side, and they can switch back from the other team's open seat.

### Story acceptance criteria — Polished Match Experience
1. Players can tell their own team, the score and the result at a glance on every match screen.
2. Run and Submit results are clear, and belong to the question they were for.
3. Joining, switching teams and readying up in the lobby take one action each.
