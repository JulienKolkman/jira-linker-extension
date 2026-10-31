# GitHub PR to Jira Linker

A browser extension that links Jira issue keys in GitHub pull request and issue titles, with buttons for logging time to Jira.

## Install the extension

1. Set `JIRA_BASE_URL` in `content.js` to `https://your-company.atlassian.net/browse/`.
2. In `chrome://extensions`, enable **Developer mode** and select **Load unpacked**.
3. Select this repository.

Open a GitHub issue or PR with a Jira key in its title (2–5 letters, a hyphen, and a number). Linking works immediately; logging time requires the server below.

## Set up work logging

The local server sends work logs to Jira Cloud using your Atlassian account. You need Node.js 22.18 or newer, Yarn, a Jira API token, and your Jira Cloud ID.

```bash
cd server
yarn install
cp .env.example .env
```

Set `JIRA_EMAIL`, `JIRA_TOKEN`, and `JIRA_CLOUD_ID` in `server/.env`. Create a [scoped API token](https://id.atlassian.com/manage-profile/security/api-tokens) with `read:jira-work` and `write:jira-work`. Find your Cloud ID in the `id` field at `https://your-company.atlassian.net/_edge/tenant_info` while signed in.

Your Jira account also needs **Browse projects** and **Work on issues** access, permission to view the issue, and enabled time tracking. See [Atlassian's worklog documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-post).

```bash
node --env-file=.env server.ts
```

The server listens on `127.0.0.1:39847`. Each button creates a Jira worklog with the comment `PR`; hover over a failed button for the error. It accepts requests from any origin using your credentials, so run it only on a trusted machine and keep `.env` private.

### Start automatically on macOS

From the repository root, run:

```bash
./server/install-launch-agent.sh
```

The script finds Node.js and the server directory, then installs and starts a LaunchAgent. Run it again after moving the repository or changing your Node.js installation.

The agent starts at login and restarts on exit. Logs are in `/tmp/jiralogger.log` and `/tmp/jiralogger.err`. To stop and unload it:

```bash
launchctl bootout "gui/$(id -u)" ~/Library/LaunchAgents/nl.julienkolkman.jiralogger.plist
```

Do not run the manual server at the same time.

## License

See [LICENSE](LICENSE).
