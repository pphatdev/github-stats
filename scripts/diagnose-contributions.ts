import 'dotenv/config';
import { Octokit } from '@octokit/rest';

const username = process.argv[2] ?? 'pphatdev';
const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error('GITHUB_TOKEN missing');
    process.exit(1);
}
const octokit = new Octokit({ auth: token });

const { data: profile } = await octokit.users.getByUsername({ username });
const createdAt = new Date(profile.created_at);
console.log(`user: ${username}   created: ${createdAt.toISOString()}`);

const years: Array<{ from: string; to: string; label: number }> = [];
let y = createdAt.getFullYear();
const now = new Date();
while (y <= now.getFullYear()) {
    const from = new Date(y, 0, 1);
    const to = new Date(y, 11, 31, 23, 59, 59);
    years.push({
        from: (from > createdAt ? from : createdAt).toISOString(),
        to: (to > now ? now : to).toISOString(),
        label: y,
    });
    y++;
}

const parts = years.map((_, i) => `$from${i}: DateTime!, $to${i}: DateTime!`).join(', ');
const sels = years.map((_, i) => `
    y${i}: contributionsCollection(from: $from${i}, to: $to${i}) {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar { totalContributions }
    }
`).join('\n');

const query = `query($u: String!, ${parts}) { user(login: $u) { ${sels} } }`;
const variables: Record<string, string> = { u: username };
years.forEach((r, i) => {
    variables[`from${i}`] = r.from;
    variables[`to${i}`] = r.to;
});

const result: any = await octokit.graphql(query, variables);
const user = result.user;

console.log('\nyear  | commits  prs   iss  reviews  restricted | calendar.total | sum(comp)');
console.log('------|-----------------------------------------|----------------|----------');
let totalCommits = 0, totalPRs = 0, totalIss = 0, totalRev = 0, totalRest = 0, totalCal = 0;
for (const r of years) {
    const i = years.indexOf(r);
    const y = user[`y${i}`];
    const c = y.totalCommitContributions;
    const p = y.totalPullRequestContributions;
    const iC = y.totalIssueContributions;
    const rv = y.totalPullRequestReviewContributions;
    const rs = y.restrictedContributionsCount;
    const cal = y.contributionCalendar.totalContributions;
    const compSum = c + p + iC + rv + rs;
    console.log(`${r.label} | ${String(c).padStart(7)}  ${String(p).padStart(4)}  ${String(iC).padStart(4)}  ${String(rv).padStart(6)}  ${String(rs).padStart(10)} | ${String(cal).padStart(14)} | ${String(compSum).padStart(8)}`);
    totalCommits += c; totalPRs += p; totalIss += iC; totalRev += rv; totalRest += rs; totalCal += cal;
}
console.log('------|-----------------------------------------|----------------|----------');
console.log(`SUM   | ${String(totalCommits).padStart(7)}  ${String(totalPRs).padStart(4)}  ${String(totalIss).padStart(4)}  ${String(totalRev).padStart(6)}  ${String(totalRest).padStart(10)} | ${String(totalCal).padStart(14)} | ${String(totalCommits+totalPRs+totalIss+totalRev+totalRest).padStart(8)}`);

console.log('\ninterpretation:');
console.log(`  calendar-total (public+restricted): ${totalCal}`);
console.log(`  components sum (c+p+i+rv+restricted): ${totalCommits+totalPRs+totalIss+totalRev+totalRest}`);
console.log(`  if user expects ~15k and profile shows that logged-in only, the difference is private contributions the API doesn't expose to third-party tokens.`);
