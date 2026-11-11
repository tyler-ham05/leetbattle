# Game Specifics Doc

> **Prelude:** I (Josh) want to start by saying a lot of specific point amounts stated in this idea doc are subject to change since balancing is a whole other can of worms that requires us to have a playerbase. Current ideas will be changed once play testers give feedback on ideas.

## How should scoring be handled?

### Points per test case passed, or only for fully correct solutions?

I think the most balanced solution would be to do both: have users be awarded for each test case and then give more points if a user solves a problem. This can be pushed further, with harder problems giving teams more points per test case and more points on an accepted submission.

### Is the team score the best submission per problem, or the sum of every member's submissions?

Best submission per problem is the better solution. This is a team effort, but I think finding the average of a teammate's solution feels wrong. The point is that teams should be playing to their strengths. If someone doesn't know how to solve a DP problem, the team shouldn't be penalized; another team member who knows the subject better should handle it.

Also, I think that if test cases are included in point totals, it would make summing more complicated, whereas best submission is by default the submission with the highest test cases passed (easier to implement).

### Do we add a time bonus or a penalty for wrong submissions?

**Time bonus:** I think time bonuses are not necessary because the point of adding a timer is to make the game quick. Adding time bonuses sounds confusing to implement because what would the other team see if they didn't get the time bonus? That being said, a tiebreaker should be implemented (current idea is first to solve a problem, but this can be reworked).

**Penalties:** I lean against penalties, however I can see an argument for them. I think iterating on code design is fundamental to competitions like this, and I feel like losing points because you missed a hyper-specific edge case is also frustrating. If the concern is overwhelming the code service, I would elect to add a rate limiter on teams before adding a direct punishment like this. However, if we allow users to submit test cases, I think it could be argued that penalties for real submissions could make users think harder about edge cases. Will leave it up in the air.

### How does a match end (timer runs out, or first team to solve everything)?

With test case bonuses, I think it should be the timer running out, for sure. Again, if the core demographic is people who struggle to stay consistent with LeetCode prep, forcing players to solve hard problems to end the game doesn't seem like a good idea.

I also believe most people who grind LeetCode subscribe to the approach of giving up after 20 minutes if they don't have an idea. If the concern is that users would want to see the solution or maybe continue working on it, maybe just give them a link to the problem and the option to see the solution (this can be fleshed out later, not a top priority).

## Additional ideas for the game that would be cool

### Hints system that costs points to use

I think this is a really cool idea that should be considered seriously. Hints are already provided in a LeetCode setting and they are super useful. However, making them cost points incentivizes players to give a shot at the problem or other problems before immediately looking at the hints.

I think it's also smart because it gives a sense of progression and strategy in solving problems, emphasizing solving the easier ones first to access hints for harder problems.

### Points per problem are not static

I think it would be cool to make unsolved problems increase in point value over time. This may change strategy mid-game and may make players more interested in trying to solve the easier problems for the entire game. I would think this would work better if there were more than 3 questions per game, though.