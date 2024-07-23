import { WebClient } from '@slack/web-api';
import { App } from '@slack/bolt';
import { Octokit } from '@octokit/rest';

// Slack and GitHub tokens
const slackToken = process.env.SLACK_BOT_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;
const slackClient = new WebClient(slackToken);
const octokit = new Octokit({ auth: githubToken });

const app = new App({
  token: slackToken,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Event listener for reactions
app.event('reaction_added', async ({ event, context }) => {
  try {
    const { item, reaction, user } = event;
    const channel = item.channel;
    const messageTs = item.ts;
    const emoji = reaction;

    console.log(emoji);

    // Define the emoji and text to look for
    const targetEmoji = 'deploybutton';
    const targetText = 'by @';

    if (emoji === targetEmoji) {
      const result = await slackClient.conversations.history({
        channel,
        latest: messageTs,
        limit: 1,
        inclusive: true
      });

      const message = result.messages[0].text;

      if (message.includes(targetText)) {
        const githubHandle = message.split(targetText)[1].trim().split(' ')[0];

        // Find the Slack user ID by GitHub handle
        const slackUserId = await findSlackUserByGitHubHandle(githubHandle);

        if (slackUserId) {
          // Send a notification to the Slack user
          await slackClient.chat.postMessage({
            channel,
            text: `<@${slackUserId}> Your GitHub handle ${githubHandle} was mentioned!`,
            thread_ts: messageTs
          });
        } else {
          console.error('Slack user not found for GitHub handle:', githubHandle);
        }
      } else {
        console.error('emoji used:', emoji);
      }
    }
  } catch (error) {
    console.error('Error handling reaction:', error);
  }
});

async function findSlackUserByGitHubHandle(githubHandle) {
  try {
    // Your GitHub to Slack mapping logic here
    const users = await slackClient.users.list();
    const githubRealName = await getUserRealName(githubHandle);
    const user = users.members.find(u => u.profile.real_name === githubRealName);
    return user ? user.id : null;
  } catch (error) {
    console.error('Error finding Slack user:', error);
    return null;
  }
}

async function getUserRealName(githubUsername) {
  try {
    const response = await octokit.users.getByUsername({
      username: githubUsername
    });
    const realName = response.data.name; // Real name of the GitHub user
    return realName;
  } catch (error) {
    console.error('Error fetching user information:', error);
    return null;
  }
}

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('Slack bot is running');
})();
