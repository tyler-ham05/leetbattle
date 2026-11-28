// US-8-T-1 
// Voting for a question
//  - The question a player voted for should carry that player's vote
//  - A player's second vote should leave their vote only on the question they voted for most recently 
//  - Two players on the same team should both be able to vote for one question
//  - A vote should leave the question pool untouched
//  - A vote once the bans have been decided should be refused with "not-banning"
//  - The ban phase should run its full window even once every player has voted

// Votes should stay inside a team
//  - A teammate should see the vote, named, and counted towards the team's tally
//  - A player should never see a vote from the other team

// A player who runs out of time to reconnect
//  - The vote they cast before dropping should still count towards their team's ban
//  - A vote from them once they have reconnected should be refused

// Banning what each team voted for
//  - The question a team's majority voted for should be the one that team bans
//  - A team's ban should ignore the other team's votes

// Ties, teams that did not vote, and both teams voting the same
//  - A tie should be settled by the match's choice among the tied questions
//  - A team that did not vote should ban one of the questions still in the pool at random. 
//  - When both teams vote for the same question, two different questions should still be banned. 

// Showing the bans before the match moves on
//  - Once the window closes, the match should stay in the ban phase, showing one ban per team
//  - A banned question should keep the place it had in the pool, with its topics
