(() => {
  "use strict";

  const shell = document.querySelector("[data-draft-id]");
  if (!(shell instanceof HTMLElement) || !window.Yomiato) return;
  const draftId = shell.dataset.draftId;
  const token = location.hash.slice(1);
  const loading = document.querySelector("[data-owner-loading]");
  const content = document.querySelector("[data-owner-content]");
  const error = document.querySelector("[data-owner-error]");
  const shareUrl = `${location.origin}/d/${draftId}`;
  let draftState = null;

  const text = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
  };

  const aftertasteLabels = {
    clear: "すっと読めた",
    confused: "少し迷った",
    more: "続きを読みたい",
    stayed: "余韻が残った",
  };

  const renderTrace = (draft, reactions) => {
    const target = document.querySelector("[data-trace-map]");
    if (!target) return;
    const rows = draft.paragraphs.map((paragraph, index) => {
      const row = document.createElement("div");
      row.className = "trace-map-row";
      const counts = Object.fromEntries(
        reactions
          .filter((reaction) => reaction.paragraph_index === index)
          .map((reaction) => [reaction.kind, reaction.count]),
      );
      if (Object.keys(counts).length) row.classList.add("has-reaction");

      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const excerpt = document.createElement("p");
      excerpt.textContent = paragraph;
      const bars = document.createElement("div");
      bars.className = "reaction-bars";
      [
        ["hooked", "●"],
        ["lost", "?"],
        ["surprised", "!"],
        ["favorite", "♥"],
      ].forEach(([kind, icon]) => {
        if (!counts[kind]) return;
        const badge = document.createElement("span");
        badge.className = kind;
        badge.textContent = `${icon} ${counts[kind]}`;
        bars.append(badge);
      });
      row.append(number, excerpt, bars);
      return row;
    });
    target.replaceChildren(...rows);
  };

  const renderFeedback = (items, question) => {
    const target = document.querySelector("[data-feedback-list]");
    if (!target) return;
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "読後メモが届くと、ここに並びます。";
      target.replaceChildren(empty);
      return;
    }
    const cards = items.map((item) => {
      const card = document.createElement("article");
      card.className = "feedback-card";
      const badge = document.createElement("span");
      badge.textContent = aftertasteLabels[item.aftertaste] ?? "読後メモ";
      const list = document.createElement("dl");
      [
        ["よかったところ", item.good_text],
        ["引っかかったところ", item.stuck_text],
        [question || "作者への返事", item.answer_text],
      ].forEach(([label, value]) => {
        if (!value) return;
        const wrapper = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        wrapper.append(term, description);
        list.append(wrapper);
      });
      card.append(badge, list);
      return card;
    });
    target.replaceChildren(...cards);
  };

  const load = async () => {
    if (!/^[0-9a-f]{64}$/.test(token)) {
      loading?.setAttribute("hidden", "");
      error?.removeAttribute("hidden");
      return;
    }
    const response = await fetch(`/api/drafts/${draftId}/manage`, {
      headers: { "x-owner-token": token },
    }).catch(() => null);
    if (!response?.ok) {
      loading?.setAttribute("hidden", "");
      error?.removeAttribute("hidden");
      return;
    }
    const result = await response.json();
    draftState = result.draft;
    text("[data-owner-title]", result.draft.title);
    text(
      "[data-owner-meta]",
      `${result.draft.paragraphs.length}段落・${result.draft.status === "active" ? "受付中" : "受付停止中"}`,
    );
    let reactionCount = 0;
    result.reactions.forEach((reaction) => {
      reactionCount += Number(reaction.count);
    });
    text("[data-reader-count]", result.readerCount);
    text("[data-reaction-count]", reactionCount);
    text("[data-feedback-count]", result.feedback.length);
    text(
      "[data-expiry]",
      `公開期限：${new Date(result.draft.expiresAt * 1000).toLocaleDateString("ja-JP")}。期限後35日以内に削除します。`,
    );
    const readerLink = document.querySelector("[data-reader-link]");
    if (readerLink instanceof HTMLAnchorElement) readerLink.href = shareUrl;
    renderTrace(result.draft, result.reactions);
    renderFeedback(result.feedback, result.draft.question);
    const toggle = document.querySelector("[data-toggle-status]");
    if (toggle)
      toggle.textContent = result.draft.status === "active" ? "受付を止める" : "受付を再開";
    loading?.setAttribute("hidden", "");
    content?.removeAttribute("hidden");
    window.Yomiato.track("owner_checked", draftId);
  };

  document.querySelector("[data-share]")?.addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(shareUrl);
    if (event.currentTarget instanceof HTMLButtonElement) {
      event.currentTarget.textContent = "コピーしました";
    }
    window.Yomiato.track("draft_shared", draftId);
  });

  document.querySelector("[data-toggle-status]")?.addEventListener("click", async () => {
    if (!draftState) return;
    const next = draftState.status === "active" ? "closed" : "active";
    const response = await fetch(`/api/drafts/${draftId}/status`, {
      body: JSON.stringify({ status: next }),
      headers: { "content-type": "application/json", "x-owner-token": token },
      method: "PATCH",
    });
    if (!response.ok) return;
    draftState.status = next;
    text(
      "[data-owner-meta]",
      `${draftState.paragraphs.length}段落・${next === "active" ? "受付中" : "受付停止中"}`,
    );
    const toggle = document.querySelector("[data-toggle-status]");
    if (toggle) toggle.textContent = next === "active" ? "受付を止める" : "受付を再開";
    if (next === "closed") window.Yomiato.track("draft_closed", draftId);
  });

  document.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!confirm("原稿、すべての反応、読後メモを完全に削除します。元に戻せません。")) return;
    const response = await fetch(`/api/drafts/${draftId}`, {
      headers: { "x-owner-token": token },
      method: "DELETE",
    });
    if (response.ok) location.replace("/");
  });

  void load();
})();
