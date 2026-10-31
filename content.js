(function () {
  const JIRA_BASE_URL = "https://msmlnl.atlassian.net/browse/";
  const LOG_ENDPOINT = "http://localhost:39847/log";
  const jiraRegex = /\b([A-Za-z]{2,5}-\d{1,10})\b/; // 2-5 letters, 1-10 digits

  // Page-visit memory: issueKey -> { totalMinutes, lastAt: Date }
  const logged = {};

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatTs(d) {
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  function isDetailPage() {
    return /\/(pull|issues)\/\d+/.test(location.pathname);
  }

  // Update the little status label next to the buttons
  function renderStatus(statusEl, issueKey) {
    const entry = logged[issueKey];
    if (!entry) {
      statusEl.textContent = "";
      return;
      if (!isDetailPage()) return;
    }
    statusEl.textContent = `✓ ${entry.totalMinutes}m · ${formatTs(entry.lastAt)}`;
    statusEl.style.color = "#1a7f37";
  }

  async function logWork(issueKey, minutes, btn, statusEl) {
    const original = btn.textContent;
    const originalBg = btn.style.background;
    btn.disabled = true;
    btn.textContent = "…";
    btn.style.opacity = "0.6";
    btn.title = "";

    try {
      const res = await fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueKey, minutes }),
      });

      const bodyText = await res.text();

      if (res.ok) {
        // record it
        const entry = logged[issueKey] || { totalMinutes: 0, lastAt: null };
        entry.totalMinutes += minutes;
        entry.lastAt = new Date();
        logged[issueKey] = entry;

        btn.textContent = "✓";
        btn.style.background = "#1a7f37";
        btn.title = `Logged ${minutes}m to ${issueKey} (total ${entry.totalMinutes}m this visit)`;
        renderStatus(statusEl, issueKey);
      } else {
        btn.textContent = "✗";
        btn.style.background = "#cf222e";
        let msg = bodyText;
        try {
          const json = JSON.parse(bodyText);
          msg =
            json.errorMessages?.join(" ") ||
            json.message ||
            (json.errors && JSON.stringify(json.errors)) ||
            bodyText;
        } catch {
          /* raw text */
        }
        btn.title = `${res.status}: ${msg}`;
        console.error(`Log failed [${res.status}]:`, msg);
      }
    } catch (e) {
      btn.textContent = "✗";
      btn.style.background = "#cf222e";
      btn.title =
        "Could not reach logger — is the local server running on :39847?";
      console.error("Log request failed (network):", e);
    }

    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = originalBg;
      btn.style.opacity = "1";
      btn.disabled = false;
    }, 2500);
  }

  function makeButton(label, issueKey, minutes, statusEl) {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      marginLeft: "8px",
      padding: "3px 12px",
      fontSize: "12px",
      fontWeight: "500",
      lineHeight: "20px",
      color: "#ffffff",
      background: "#1f883d",
      border: "1px solid rgba(31,35,40,0.15)",
      borderRadius: "6px",
      cursor: "pointer",
      verticalAlign: "middle",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    });
    btn.onmouseenter = () => {
      if (!btn.disabled) btn.style.background = "#1a7f37";
    };
    btn.onmouseleave = () => {
      if (!btn.disabled) btn.style.background = "#1f883d";
    };
    btn.onclick = (e) => {
      e.preventDefault();
      logWork(issueKey, minutes, btn, statusEl);
    };
    return btn;
  }

  function convertToJiraLinks() {
    if (!isDetailPage()) return;

    const titleElement1 = document.querySelector(
      ".gh-header-title .js-issue-title",
    );
    const titleElement2 = document.querySelector(".markdown-title");

    let titleElement = null;
    if (titleElement1) {
      titleElement = titleElement1;
    } else if (titleElement2) {
      titleElement = titleElement2;
    } else {
      return;
    }

    const text = titleElement.textContent.trim();
    const match = text.match(jiraRegex);
    if (match) {
      const issueKey = match[0].toUpperCase();
      const jiraUrl = `${JIRA_BASE_URL}${issueKey}`;

      if (titleElement.dataset.jiraEnhanced === issueKey) return;
      titleElement.dataset.jiraEnhanced = issueKey;

      const link = document.createElement("a");
      link.href = jiraUrl;
      link.textContent = issueKey;
      link.target = "_blank";
      link.style.color = "#0366d6";
      link.style.textDecoration = "none";
      link.style.fontWeight = "bold";

      titleElement.innerHTML = titleElement.innerHTML.replace(
        match[0],
        link.outerHTML,
      );

      // Status label (shows total + last timestamp for this visit)
      const statusEl = document.createElement("span");
      Object.assign(statusEl.style, {
        marginLeft: "10px",
        fontSize: "14px",
        fontWeight: "600",
        verticalAlign: "middle",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      });

      titleElement.append(
        makeButton("+5m", issueKey, 5, statusEl),
        makeButton("+10m", issueKey, 10, statusEl),
        statusEl,
      );

      // If we already logged this key earlier this visit, show it immediately
      renderStatus(statusEl, issueKey);
    }
  }

  const observer = new MutationObserver(convertToJiraLinks);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", convertToJiraLinks);
})();
