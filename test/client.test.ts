import { describe, expect, it } from "vitest";

import builder from "../public/builder.js?raw";
import common from "../public/common.js?raw";
import owner from "../public/owner.js?raw";
import reader from "../public/reader.js?raw";

describe("client safety and product flow", () => {
  it("creates drafts through JSON and previews content with textContent", () => {
    expect(builder).toContain('fetch("/api/drafts"');
    expect(builder).toContain("paperTitle.textContent");
    expect(builder).toContain("result.manageUrl");
    expect(builder).not.toContain("innerHTML");
  });

  it("keeps the management token in the fragment and renders private feedback safely", () => {
    expect(owner).toContain("location.hash.slice(1)");
    expect(owner).toContain('"x-owner-token"');
    expect(owner).toContain("replaceChildren");
    expect(owner).toContain("textContent");
    expect(owner).not.toContain("innerHTML");
  });

  it("uses anonymous device identity without cookies and keeps reader reactions private", () => {
    expect(common).toContain("localStorage");
    expect(common).not.toContain("document.cookie");
    expect(reader).toContain(`/api/drafts/\${draftId}/reactions`);
    expect(reader).toContain(`/api/drafts/\${draftId}/feedback`);
    expect(reader).not.toContain("innerHTML");
  });
});
