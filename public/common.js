(() => {
  "use strict";

  const sessionKey = "yomiato_session";
  const lastSeenKey = "yomiato_last_seen";

  const getSessionId = () => {
    let sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(sessionKey, sessionId);
    }
    return sessionId;
  };

  const track = (name, draftId = "") =>
    fetch("/api/events", {
      body: JSON.stringify({ draftId, name, sessionId: getSessionId() }),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);

  const previous = Number(localStorage.getItem(lastSeenKey) ?? 0);
  const now = Date.now();
  if (previous && now - previous > 86_400_000) void track("returned");
  localStorage.setItem(lastSeenKey, String(now));
  if (location.pathname === "/") void track("visited");

  window.Yomiato = { getSessionId, track };
})();
