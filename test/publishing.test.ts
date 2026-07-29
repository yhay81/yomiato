import { describe, expect, it } from "vitest";

import metricsScript from "../ops/product-metrics.ps1?raw";
import metricsSql from "../ops/product-metrics.sql?raw";
import packageJson from "../package.json?raw";
import robots from "../public/robots.txt?raw";
import sitemap from "../public/sitemap.xml?raw";
import readme from "../README.md?raw";
import product from "../src/config/product.ts?raw";
import wrangler from "../wrangler.jsonc?raw";

describe("publishing contract", () => {
  it("uses the yomiato yhay81.com origin and a D1 database", () => {
    for (const content of [product, wrangler, packageJson, robots, sitemap, readme]) {
      expect(content).toContain("yomiato.yhay81.com");
      expect(content).not.toContain("yusuke8h.workers.dev");
    }
    expect(wrangler).toContain('"workers_dev": false');
    expect(wrangler).toContain('"custom_domain": true');
    expect(wrangler).toContain('"binding": "DB"');
  });

  it("keeps manuscripts, management pages, and APIs out of discovery", () => {
    expect(robots).toContain("Disallow: /d/");
    expect(robots).toContain("Disallow: /manage/");
    expect(robots).toContain("Disallow: /api/");
    expect(sitemap).not.toContain("/d/");
    expect(sitemap).not.toContain("/manage/");
    expect(sitemap).toContain("/guide");
  });

  it("provides privacy-safe production metrics for the complete product funnel", () => {
    for (const event of [
      "draft_created",
      "draft_shared",
      "draft_viewed",
      "reaction_left",
      "feedback_submitted",
      "owner_checked",
      "returned",
    ]) {
      expect(metricsSql).toContain(`name = '${event}'`);
    }
    expect(metricsScript).toContain('service = "yomiato"');
    expect(metricsScript).not.toContain("good_text");
    expect(metricsScript).not.toContain("paragraphs_json");
  });
});
