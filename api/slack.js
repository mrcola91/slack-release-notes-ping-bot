import { WebClient } from '@slack/web-api';
import { Octokit } from '@octokit/rest';

// Slack and GitHub tokens
const slackToken = process.env.SLACK_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;

// Initialize Slack and GitHub clients
const slackClient = new WebClient(slackToken);
const octokit = new Octokit({ auth: githubToken });

async function getReleaseNotes(owner, repo, releaseTag) {
  try {
    const { data } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: releaseTag
    });
    return data.body;
  } catch (error) {
    console.error('Error fetching release notes:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST' && req.body.challenge) {
    res.status(200).json({ challenge: req.body.challenge });
  } else if (req.method === 'POST') {
    const { channel, thread_ts, owner, repo, releaseTag } = req.body;

    const releaseNotes = await getReleaseNotes(owner, repo, releaseTag);
    const messageText = releaseNotes ? `Here are the release notes:\n${releaseNotes}` : 'Failed to retrieve release notes.';

    try {
      await slackClient.chat.postMessage({
        channel,
        text: messageText,
        thread_ts
      });
      res.status(200).send('Message posted');
    } catch (error) {
      console.error('Error posting to Slack:', error);
      res.status(500).send('Error posting message');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
