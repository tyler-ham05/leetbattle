
 // Lobby should require authentication
 //  - Connections without a valid login token should be rejected

 // Lobby should enforce player capacity
 //  - A maximum of six unique players can join the lobby
 //  - Joining the lobby multiple times should not increase the player count
 //  - A seventh player attempting to join should receive a "lobby-full" error

 // Lobby should enforce team capacity
 //  - Each team should support a maximum of three players
 //  - Attempting to join a full team should return a "team-full" error
 //  - Players should be able to switch teams if the destination team has space

 // Players should only be able to ready up when the lobby is full
 //  - Attempting to ready up before both teams are filled should return a "lobby-not-ready" error

 // Lobby should start a countdown when all players are ready
 //  - When all six players are ready, a countdown should be broadcast to connected clients
 //  - The countdown should begin with a value between 1 and 5 seconds
 //  - After the countdown, a "lobby:ready-for-match" event should be sent to all connected clients
 //  - The event should contain all six unique players and the correct lobby ID
 //  - The lobby should be marked as ready to start

 // Countdown should be canceled when a player becomes unready
 //  - If a player becomes unready during the countdown, the ready count should decrease to five
 //  - The countdown should be cleared for all connected clients
 //  - The match should not start

 // Countdown should be canceled when a player disconnects
 //  - If a player disconnects during the countdown, their connected status should become false
 //  - The ready count should decrease to five
 //  - The countdown should be cleared
 //  - The match should not start

 // Players should be able to leave the lobby
 //  - Leaving should release the player's lobby seat
 //  - The player count should decrease
 //  - The updated lobby state should be broadcast

 // Lobby should handle temporary disconnections
 //  - A disconnected player should temporarily retain their lobby seat
 //  - Reconnecting within the grace period should restore their connected status without creating a duplicate player
 //  - Failing to reconnect within the grace period should remove the player and release their seat
