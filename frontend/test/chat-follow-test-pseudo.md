// US-3-T-5: team chat follows new messages and marks the player's own (all tests use mocked messages / a mocked socket, no backend)

 // The chat list should follow new messages while the player is at the bottom
 //  - When the player is at the bottom of the list, a new message should scroll the list to the newest message
 //  - When the player is within 48px of the bottom, a new message should scroll the list to the newest message
 //  - When the player is at the bottom, "New messages" should not be shown after a new message

 // The chat list should not move a player who has scrolled up to read
 //  - When the player has scrolled up, a new message should not move the list
 //  - When the player has scrolled up, a new message should show a "New messages" button
 //  - Clicking "New messages" should scroll the list to the newest message
 //  - Clicking "New messages" should hide the button
 //  - Scrolling back to the bottom should hide "New messages"

 // Sending a message should always scroll to the bottom
 //  - When the player has scrolled up and sends a message, the list should scroll to the newest message
 //  - When the player has scrolled up and their own message comes back over the socket, the list should scroll to the newest message

 // The player's own messages should be marked
 //  - The player's own message should be labeled "You"
 //  - The player's own message should not show their name
 //  - The "You" label should use the ink color (text-ink)
 //  - A teammate's message should still show the teammate's name
 //  - A teammate's name should stay in the primary color (text-primary)
