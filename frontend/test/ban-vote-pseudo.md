// US-8-T-1 
// A player should be able to vote for a question to ban
//  - When the player has not voted, every question should offer to vote for it
//  - Clicking a question should ask to vote for that question
//  - The question the player voted for should be marked as their vote
//  - When the player has voted, the other questions should still offer to vote for them

// A player should see their own team's votes, live
//  - A question should display the names of the teammates who voted for it
//  - The header should display how many of the player's own team have voted

// The reveal should show both bans once the window closes
//  - A banned question should be labelled with the team that banned it
//  - A banned question should not offer to vote for it

// The ban screen should describe the match from the state it is given
//  - The intro should say the match is played on the nine questions that are left

// The game page should wire the ban screen up (see game-test-pseudo.md)
//  - Clicking a question should send the player's vote through the game socket
