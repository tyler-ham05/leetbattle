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
