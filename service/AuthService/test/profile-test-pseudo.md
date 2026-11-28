# AuthService: player profiles (US-7-T-5)

Drafted from the spec (docs/tasks/sprint-4/US-7-T-5.md); the user asked to proceed with it.

## A new player (AC1)
- A player who just signed up should have the `katana` icon in GET /me
- A player who just signed up should have an empty description in GET /me
- A player who just signed up should have no picture (null) in GET /me

## League bounds in GET /me (AC6)
- A player rated 642 should have leagueMin 600
- A player rated 642 should have nextLeague { name: "Gold II", at: 700 }
- A player rated 2000 should have nextLeague null

## Changing your own profile: PATCH /account (AC2, AC3, AC5)
- Setting icon to `bolt` should return the user with icon `bolt`
- After setting icon to `bolt`, GET /me should show `bolt`
- An icon that isn't one of the 8 keys should return 400
- After a rejected icon, GET /me should still show the old icon
- A description of 80 characters should be saved
- A description of 81 characters should return 400
- After a rejected description, GET /me should still show the old description
- A description with spaces around it should be saved trimmed
- An empty description should clear it
- A description containing `<script>alert(1)</script>` should be saved exactly as sent (it's shown as text, not run)
- A body with none of name, icon and description should return 400
- Without a login token it should return 401
- Sending another player's id in the body should still only change the signed-in player

## Profile picture: PUT /account/picture and DELETE /account/picture (AC4, AC5)
- A small PNG sent as a data URL should return 200
- After uploading a PNG, GET /me should return the picture as a data:image/png;base64 URL with the same bytes
- A small JPEG should be accepted
- A small WebP should be accepted
- A data URL that says image/png but holds a GIF's bytes should return 400
- Text pretending to be an image (data:image/png;base64 of "<svg>...") should return 400
- A picture over 200 KB once decoded should return 400
- After a rejected picture, GET /me should still show the old picture
- A body without an image should return 400
- Without a login token it should return 401
- DELETE /account/picture should return 200
- After DELETE /account/picture, GET /me should show picture null
- After DELETE /account/picture, the player's icon should be unchanged

## Another player's profile: GET /users/:id (AC6)
- It should return their picture (null when they have none)
- Signed in, GET /users/<their id> should return 200
- It should return their name
- It should return their icon
- It should return their description
- It should return their rating and league
- It should not include an email field
- It should not include an emailVerified field
- Without a login token it should return 401
- An id that isn't a UUID should return 404
- A UUID with no user should return 404

## Recent matches: GET /me and GET /users/:id `recentMatches` (US-7-T-5, last-10 chart, brought into scope by the user)
- A player who just signed up should have recentMatches [] in GET /me
- After a reported 1v1 win, the winner's GET /me recentMatches should have 1 entry
- That entry's result should be 'W'
- That entry's change should equal the change in the match-results response
- That entry's ratingAfter should equal the newRating in the match-results response
- That entry's playedAt should be an ISO date string
- In a 1v1, the entry's teamSize should be 1
- In a 2v2, the entry's teamSize should be 2
- The loser of a 1v1 should have an entry with result 'L'
- After a draw, the entry's result should be 'D'
- After 12 reported matches, only 10 entries should be returned
- After 12 reported matches, the entries should be the last 10, oldest first (the first returned is the 3rd match)
- GET /users/:id should also return the player's recentMatches
- An unknown user in the payload should create no match_history row
- An unknown user in the payload should not stop the known player getting their entry
- The signup response's user should include recentMatches []

## Demo player seed (scripts/seed-demo.ts)
- The 10 demo matches should number exactly 10
- The last demo match's ratingAfter should be the target rating (2046)
- Each demo match's ratingAfter should be the previous ratingAfter plus its change
- The demo matches should be ordered oldest first
- Running the seed should create the demo user with rating 2046
- Running the seed should give the demo user exactly 10 match_history rows
- Running the seed twice should still leave exactly 10 rows for the demo user
- Running the seed should not change another user's rating
- Running the seed should not remove another user's match_history rows
- The demo user should be able to log in with demo@leetbattle.local / demo-password

## Fixes from the code review
- A player with a name should have it as their displayName in GET /me
- A player who signed up without a name should get the part of their email before the @ as their displayName in GET /me
- GET /users/:id should give the same displayName for a player without a name (the lobby already shows that name)
- POST /internal/match-results with every player on one team should return 400, not rate anyone
- POST /internal/match-results should answer 500 (not hang) when the database can't be reached
