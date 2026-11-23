// US-3-T-2: team chat over the GameService socket
// All tests use a fresh game with at least two players on each team.
// All players must be confirmed to be connected to the GameService before running any tests and no team is marked as left. 

// GameService should deliver a team chat message to the sender's team
 //  - A player's "chat:send" should be delivered as a "chat:message" to every connected teammate
 //  - The sender should receive their own "chat:message"
 //  - A "chat:message" should carry the message id, sender's user id, display name, team, text and sent time
 //  - A player on the other team should not receive the "chat:message"

 
// GameService should limit message text
//  - A "chat:send" with no more than 500 characters should be delivered
//  - A "chat:send" with text longer than 500 characters should not send "chat:message"
//  - A "chat:send" with text longer than 500 characters should give the user an error saying "Message too long"


 // GameService should save each accepted team message
 //  - A valid "chat:send" should add one row to "team_messages"
 //  - The saved row should have the game's id
 //  - The saved row should have the sender's team
 //  - The saved row should have the sender's user id
 //  - The saved row should have a sent time that is set
 //  - The saved row should have the message body as text
 //  - A "chat:send" with text longer than 500 characters should not be saved to "team_messages"

 // GameService should not take chat messages after the game has ended
 //  - After "game:ended", a "chat:send" should not be saved to "team_messages"
 //  - After "game:ended", a "chat:send" should send no "chat:message"

 // GameService should keep chat separate between games
 //  - When two games are running, a "chat:send" in one game should not reach the players of the other game
 //  - The saved "team_messages" row should have the id of the game the message was sent in



// Task: US-3-T-4 
// Team chat should rate limit messages and not store rejected ones
//  - A second "chat:send" from the same player within 1 second should be rejected with "Whoa, slow down!"
//  - A rejected message should not be saved to "team_messages" 
//  - A rejected message should not cause a "chat:message" to be sent  

// Team chat should store message text safely
//  - A message containing SQL should be saved as plain text 
//  - A message containing SQL should not be run as a SQL command 

// Team chat messages should be cleaned up when a game ends
//  - When a game ends, messages older than 10 days should be deleted  
//  - When a game ends, messages newer than 10 days should be kept


// User story: US-3 Communication
// Task: US-3-T-3
// GameService should send a player their team's chat history when they connect
//  - After two teammates each send a message, a teammate who reconnects should be sent "chat:history" with both messages
//  - The messages in "chat:history" should be oldest first so they read properly going from top(oldest) to bottom (newest)
//  - Each message in "chat:history" should have the same id, userId, displayName, team, text and sentAt as the "chat:message" that was sent out

// GameService should keep chat history to the player's own team
//  - After a player on the other team sends a message, a reconnecting player should not see it in "chat:history"

// GameService should keep chat history to the player's own game
//  - When two games are running, a message sent in one game should not be in "chat:history" for a player reconnecting to the other game

// GameService should send an empty history when the team has no messages
//  - A player who connects before anyone on their team has chatted should be sent an empty chat history

// GameService should leave rejected messages out of chat history
//  - A "chat:send" longer than 500 characters should not be in chat history
//  - A rate-limited "chat:send" should not be in chat history.
