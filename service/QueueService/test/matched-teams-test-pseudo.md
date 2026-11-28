# Team names on queue:matched (US-10-T-10)

## Own team (yourTeam)
- In a 1v1, the first player should get yourTeam with exactly their own name
- In a 2v2, a team-a player should get the two team-a names as yourTeam, in queue order
- In a 3v3, a team-a player should get the three team-a names as yourTeam, in queue order
- The receiving player's own name should be included in their yourTeam
- A team-b player in a 2v2 should get the two team-b names as yourTeam, in queue order

## Rivals
- In a 1v1, the first player should get the second player's name as the only rival
- In a 2v2, a team-a player should get the two team-b names as rivals, in queue order
- In a 3v3, a team-a player should get the three team-b names as rivals, in queue order
- A team-b player in a 2v2 should get the two team-a names as rivals, in queue order
- The receiving player's own name should not appear in their rivals

## Sizes
- In a 1v1, yourTeam and rivals should each have 1 name
- In a 2v2, yourTeam and rivals should each have 2 names
- In a 3v3, yourTeam and rivals should each have 3 names

## Existing behaviour
- Every matched player should still get the same gameId as before
- When GameService fails, no player should receive queue:matched

## Existing tests this task changes
None (queue.test.ts and stress.test.ts only read `.gameId` from the payload; none assert the exact payload with toEqual({ gameId })).
