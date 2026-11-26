/*
 * DEMO assistant replies — illustrative only, with fictional games and
 * figures. They are never stored and never mixed with real studio data.
 */

type DemoReply = { match: RegExp; reply: string };

const REPLIES: DemoReply[] = [
  {
    match: /revenue|robux|money|earn|devex|profit|finance/i,
    reply: `Here is the kind of revenue summary I'll give once connected to your data.

### Revenue, last 30 days
**R$ 412K** (≈ $1,566 at the DevEx rate), up **8%** vs the previous 30 days.

- **Lava Escape** — R$ 236K, driven by the new game pass
- **Pet Café** — R$ 121K, steady week over week
- **Sky Racers** — R$ 55K, down 12% since the last update

**Suggestion:** check Sky Racers' day-1 retention before shipping the next update.`,
  },
  {
    match: /retention|players|dau|ccu|playtime|session/i,
    reply: `Example answer, with fictional games:

### Retention, last 30 days
1. **Pet Café** — D1 31%, D7 12%: the strongest loop of the studio
2. **Lava Escape** — D1 24%, D7 8%
3. **Sky Racers** — D1 17%, D7 4%: players leave after the tutorial

**Suggestion:** shorten Sky Racers' tutorial and give a reward in the first 3 minutes.`,
  },
  {
    match: /task|project|team|focus|week|deadline|late|overdue/i,
    reply: `Example of a weekly focus, based on fictional projects:

### This week
- **3 tasks are overdue** on *Lava Escape — Season 2*, all assigned to the build team
- **Pet Café update** is at 80%: QA is the last step before release
- Nobody is assigned to *Sky Racers — new map* yet

**Suggestion:** move one builder to the Season 2 backlog until Friday.`,
  },
  {
    match: /idea|trend|genre|game|discover|market/i,
    reply: `Three example ideas, the way I'll present them once connected to the Discover data:

1. **Co-op tycoon with short rounds** — tycoons keep trending; rounds under 10 minutes fit mobile sessions
2. **Obby with daily community levels** — strong replay value, cheap content pipeline
3. **Pet collection + light combat** — pairs two genres that are both growing this month

Each idea would come with the charted games it's inspired by and a market score.`,
  },
];

const FALLBACK = `I'm running in **demo mode**: my answers are illustrative examples with fictional games.

Once Claude is connected, I'll answer questions about your studio using your real data:

- revenue, players and retention of your games
- projects, tasks and who is working on what
- market trends from Roblox Discover

Try one of the suggestions to see what an answer looks like.`;

export function demoReply(question: string): string {
  return REPLIES.find((r) => r.match.test(question))?.reply ?? FALLBACK;
}
