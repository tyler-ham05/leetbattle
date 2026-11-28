# GameService reports each match's result to AuthService (US-7-T-1)

(AuthService is replaced with a stand-in; no test calls the real service.)

## Reporting the result when a match ends (AC6)
- When a match ends with a winner, GameService should send one POST to AuthService's /internal/match-results
- The report should carry the internal key as "Authorization: Bearer <INTERNAL_API_KEY>"
- The report should name the winning team ("a" or "b")
- The report should list every player on the roster with their team
- A player who left mid-match should still be listed in the report
- When a match ends on time with level scores, the report's winner should be null (a draw)

## A failed report doesn't break the match
- When AuthService answers with an error, the players should still receive "game:ended"
- When AuthService can't be reached, the players should still receive "game:ended"
