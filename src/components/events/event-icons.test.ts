import { describe, expect, it } from "vitest";
import {
  DIMENSION_ICONS,
  EVIDENCE_KIND_ICONS,
  PESTEL_ICONS,
  REGULATION_ORIGIN_ICONS,
  SEVERITY_ICONS,
  TIMELINE_KIND_ICONS,
} from "./event-icons";

describe("event icon maps", () => {
  it.each([
    ["dimension", DIMENSION_ICONS, 5],
    ["severity", SEVERITY_ICONS, 3],
    ["timeline kind", TIMELINE_KIND_ICONS, 4],
    ["regulation origin", REGULATION_ORIGIN_ICONS, 3],
    ["evidence kind", EVIDENCE_KIND_ICONS, 4],
    ["pestel", PESTEL_ICONS, 6],
  ])("%s covers every value with a renderable icon", (_name, map, size) => {
    const icons = Object.values(map);
    expect(icons).toHaveLength(size);
    for (const icon of icons) expect(icon).toBeTruthy();
  });

  it("uses the same icon for the same concept across maps", () => {
    expect(TIMELINE_KIND_ICONS.regulation).toBe(DIMENSION_ICONS.regulation);
    expect(EVIDENCE_KIND_ICONS.regulation).toBe(DIMENSION_ICONS.regulation);
    expect(EVIDENCE_KIND_ICONS.contract).toBe(TIMELINE_KIND_ICONS.contract);
    expect(EVIDENCE_KIND_ICONS.news).toBe(TIMELINE_KIND_ICONS.news);
  });
});
