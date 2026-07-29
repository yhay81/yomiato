(() => {
  "use strict";

  const shell = document.querySelector("[data-draft-id]");
  if (!(shell instanceof HTMLElement) || !window.Yomiato) return;
  const draftId = shell.dataset.draftId;
  const sessionId = window.Yomiato.getSessionId();
  const selected = new Map();

  window.Yomiato.track("draft_viewed", draftId);

  document.querySelectorAll(".reaction-row button").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!(button instanceof HTMLButtonElement)) return;
      const index = Number(button.dataset.index);
      const kind = button.dataset.kind;
      const current = selected.get(index);
      const next = current === kind ? null : kind;
      const row = button.closest(".reaction-row");
      row?.querySelectorAll("button").forEach((candidate) => candidate.classList.remove("active"));
      if (next) button.classList.add("active");
      selected.set(index, next);

      const response = await fetch(`/api/drafts/${draftId}/reactions`, {
        body: JSON.stringify({ index, kind: next, sessionId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }).catch(() => null);
      if (!response?.ok) {
        button.classList.remove("active");
        selected.delete(index);
      }
    });
  });

  const form = document.querySelector("[data-feedback-form]");
  const message = document.querySelector("[data-feedback-message]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    const response = await fetch(`/api/drafts/${draftId}/feedback`, {
      body: JSON.stringify({
        aftertaste: data.get("aftertaste"),
        answerText: data.get("answerText"),
        goodText: data.get("goodText"),
        sessionId,
        stuckText: data.get("stuckText"),
        website: data.get("website"),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => null);
    if (message) {
      message.textContent = response?.ok
        ? "作者へ届けました。あとから書き直して送ることもできます。"
        : "感想をひとつ以上書いて、もう一度お試しください。";
    }
  });

  const reportDialog = document.querySelector("[data-report-dialog]");
  const reportForm = document.querySelector("[data-report-form]");
  const reportMessage = document.querySelector("[data-report-message]");
  document.querySelector("[data-report]")?.addEventListener("click", () => {
    if (reportDialog instanceof HTMLDialogElement) reportDialog.showModal();
  });
  document.querySelector("[data-report-cancel]")?.addEventListener("click", () => {
    if (reportDialog instanceof HTMLDialogElement) reportDialog.close();
  });
  reportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(reportForm instanceof HTMLFormElement)) return;
    const reason = new FormData(reportForm).get("reason");
    const response = await fetch(`/api/drafts/${draftId}/report`, {
      body: JSON.stringify({ reason, sessionId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => null);
    if (reportMessage) {
      reportMessage.textContent = response?.ok
        ? "報告を受け付けました。この画面は閉じてかまいません。"
        : "報告できませんでした。少し待ってからお試しください。";
    }
  });
})();
