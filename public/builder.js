(() => {
  "use strict";

  const form = document.querySelector("[data-builder]");
  if (!(form instanceof HTMLFormElement) || !window.Yomiato) return;

  const content = form.querySelector("[data-preview-content]");
  const title = form.querySelector("[data-preview-title]");
  const count = form.querySelector("[data-character-count]");
  const paperTitle = document.querySelector("[data-paper-title]");
  const paperParagraphs = [...document.querySelectorAll("[data-paper-paragraph]")];
  const error = form.querySelector("[data-form-error]");
  const submit = form.querySelector('button[type="submit"]');

  const split = (value) =>
    value
      .trim()
      .split(/\n\s*\n+/)
      .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
      .filter(Boolean);

  const updatePreview = () => {
    if (title instanceof HTMLInputElement && paperTitle) {
      paperTitle.textContent = title.value.trim() || "波止場の灯り";
    }
    if (content instanceof HTMLTextAreaElement) {
      if (count) count.textContent = `${content.value.length.toLocaleString("ja-JP")} / 6,000`;
      const paragraphs = split(content.value);
      paperParagraphs.forEach((element, index) => {
        if (paragraphs[index]) element.textContent = paragraphs[index].slice(0, 72);
      });
    }
  };

  title?.addEventListener("input", updatePreview);
  content?.addEventListener("input", updatePreview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(submit instanceof HTMLButtonElement) || !window.Yomiato) return;
    submit.disabled = true;
    if (error) error.textContent = "";
    const data = new FormData(form);
    const body = {
      content: data.get("content"),
      expiryDays: Number(data.get("expiryDays")),
      focus: data.get("focus"),
      note: data.get("note"),
      penName: data.get("penName"),
      question: data.get("question"),
      sessionId: window.Yomiato.getSessionId(),
      title: data.get("title"),
      website: data.get("website"),
    };

    try {
      const response = await fetch("/api/drafts", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        const message =
          result.error === "rate_limited"
            ? "1日に作れる読み跡は3件までです。"
            : "原稿は100〜6,000字で、必須項目を確認してください。";
        if (error) error.textContent = message;
        return;
      }
      location.assign(result.manageUrl);
    } catch {
      if (error) error.textContent = "通信できませんでした。少し待って、もう一度お試しください。";
    } finally {
      submit.disabled = false;
    }
  });

  updatePreview();
})();
