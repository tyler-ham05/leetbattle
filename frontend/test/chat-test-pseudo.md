// US-3-T-1: team chat panel on the match screen (all tests use mocked comments, no backend)

 // The match screen should have a team chat panel
 //  - When the match screen loads, a "Team chat" panel should be displayed

 // A player should be able to read team comments
 //  - When the team has two comments, the text of each comment should be displayed
 //  - Each comment should display the name of the player who posted it
 //  - When the team has no comments, "No messages yet" should be displayed

 // A player should be able to post a team comment
 //  - Typing a comment and clicking "Send" should display the comment in the panel
 //  - A posted comment should display the signed-in player's name
 //  - Pressing Enter in the message box should post the comment
 //  - After posting, the message box should be empty
 //  - A posted comment should have the spaces around it trimmed
 //  - When the message box is empty, "Send" should be disabled
 //  - When the message box only has spaces, "Send" should be disabled


// US-3-T-2: team chat messages over the game socket (all tests use a mocked socket, no backend)

 // The chat panel should send comments over the game socket
 //  - Calling "send" should emit "chat:send" with the message text
 //  - After calling "send", the comment should not appear in the panel until the server delivers it
 //  - When there is no game socket, "send" should still show the comment locally (keep passing existing tests)

// The chat panel should show comments the server delivers
//  - An incoming "chat:message" should appear in the panel once
//  - An incoming "chat:message" should show the name of the player who sent it
//  - When the sender's own "chat:message" comes back, it should appear once, not twice
//  - When "chat:send" is answered with "Message too long", the chat bar should show "Message too long"


// The match page should show team chat while the game is being played
//  - While playing, the match page should display a "Team chat" panel
//  - Sending a comment on the match page should emit "chat:send" on the game socket


// US-3-T-4

// Team chat should handle rejected messages and unsafe text
//  - When a message is rate limited, the chat panel should show "Whoa, slow down!" 
//  - When a message is rejected, the message box should keep its text  
//  - A chat error shown in the chat panel should disappear after 5 seconds  
//  - HTML / scripts in a message should be shown as text  
//  - HTML / scripts in a message should not run  
//  - A message containing SQL should be shown as plain text 



// User story: US-3 Communication
// Task: US-3-T-3 (all tests use a mocked socket, no backend)

// The chat panel should show the team's earlier messages
//  - When the game socket receives "chat:history" with two messages, the chat panel on the match page should show both
//  - The messages from "chat:history" should be shown oldest first at the top
//  - A "chat:message" that arrives after "chat:history" should be shown after the history
//  - When "chat:history" is empty, the chat panel should show "No messages yet"

// The chat panel should not show a message twice 
//  - When a message is in "chat:history" and then also arrives as a "chat:message", it should be shown once

// The chat panel should restore history after reconnecting 
//  - After the socket reconnects and receives a new "chat:history", the panel should show the team's earlier messages
//  - Messages the panel already showed before reconnecting should not be shown twice
