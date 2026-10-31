// server.ts — run with: node --env-file=.env server.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";

interface LogRequest {
  issueKey: string;
  minutes: number;
}

const app = express();
app.use(express.json());

// allow the extension (any origin, since it's local-only)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_TOKEN;
const cloudId = process.env.JIRA_CLOUD_ID;
if (!email || !token || !cloudId) {
  throw new Error("JIRA_EMAIL, JIRA_TOKEN and JIRA_CLOUD_ID must be set");
}
const AUTH = Buffer.from(`${email}:${token}`).toString("base64");
const BASE = `https://api.atlassian.com/ex/jira/${cloudId}`;

app.post("/log", async (req: Request<{}, {}, LogRequest>, res: Response) => {
  const { issueKey, minutes } = req.body;

  const r = await fetch(`${BASE}/rest/api/3/issue/${issueKey}/worklog`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${AUTH}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeSpentSeconds: minutes * 60,
      comment: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "PR" }],
          },
        ],
      },
    }),
  });

  if (!r.ok) return res.status(r.status).send(await r.text());
  res.json({ ok: true });
});

app.listen(39847, "127.0.0.1", () =>
  console.log("Jira logger on http://localhost:39847"),
);