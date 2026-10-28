import { describe, expect, it } from "vitest";
import {
  IMPACT_BY_RULE,
  PESTEL_CRITERIA,
  impactForRule,
  pestelForNewsTerm,
  pestelForRegulation,
  pestelForRule,
} from "./pestel-mapping";

describe("pestelForRule", () => {
  it("tags the TRM rule as economic", () => {
    expect(pestelForRule("trm.daily-move.v1")).toBe("economic");
  });

  it("tags an own expiring contract as political (public buyer decides the renewal)", () => {
    expect(pestelForRule("secop.expiring-contract.v1")).toBe("political");
  });

  it("tags a competitor contract as economic (market share)", () => {
    expect(pestelForRule("secop.competitor-new-contract.v1")).toBe("economic");
  });

  it("tags regulation rules as legal by prefix", () => {
    expect(pestelForRule("regulation.new-norm.v1")).toBe("legal");
  });

  it("falls back to economic for an unknown rule id", () => {
    expect(pestelForRule("something.else.v1")).toBe("economic");
  });
});

describe("pestelForNewsTerm", () => {
  it("sends regulation terms to legal", () => {
    expect(pestelForNewsTerm("regulation", "REP envases")).toBe("legal");
    expect(pestelForNewsTerm("regulation", "Resolución 1407")).toBe("legal");
  });

  it("sends sustainability terms of the regulation group to environmental", () => {
    expect(pestelForNewsTerm("regulation", "reciclaje")).toBe("environmental");
    expect(pestelForNewsTerm("regulation", "sostenibilidad")).toBe("environmental");
  });

  it("tags circular economy as environmental, not legal", () => {
    expect(pestelForNewsTerm("regulation", "economía circular")).toBe("environmental");
  });

  it("splits operational risks between economic and social", () => {
    expect(pestelForNewsTerm("operations", "gas natural")).toBe("economic");
    expect(pestelForNewsTerm("operations", "dólar")).toBe("economic");
    expect(pestelForNewsTerm("operations", "paro camionero")).toBe("social");
    expect(pestelForNewsTerm("operations", "bloqueo de vías")).toBe("social");
  });

  it("moves a term to the factor its general vocabulary names, in any sector", () => {
    expect(pestelForNewsTerm("sector", "cambio climático")).toBe("environmental");
    expect(pestelForNewsTerm("operations", "huelga de trabajadores")).toBe("social");
    expect(pestelForNewsTerm("sector", "inteligencia artificial")).toBe("technological");
    expect(pestelForNewsTerm("operations", "ciberseguridad")).toBe("technological");
    expect(pestelForNewsTerm("sector", "reforma tributaria")).toBe("political");
  });

  it("keeps the group's factor when the term says nothing else", () => {
    expect(pestelForNewsTerm("sector", "cultivo de flores")).toBe("economic");
    expect(pestelForNewsTerm("regulation", "reforma tributaria")).toBe("legal");
    expect(pestelForNewsTerm("company", "agua")).toBe("social");
  });

  it("matches at word starts only and ignores accents", () => {
    expect(pestelForNewsTerm("operations", "separo")).toBe("economic");
    expect(pestelForNewsTerm("operations", "Paro camionero")).toBe("social");
    expect(pestelForNewsTerm("regulation", "Sostenibilidad")).toBe("environmental");
  });

  it("tags company mentions as social and sector terms as economic", () => {
    expect(pestelForNewsTerm("company", "Empresa Ejemplo")).toBe("social");
    expect(pestelForNewsTerm("sector", "papel")).toBe("economic");
  });
});

describe("pestelForRegulation", () => {
  it("is always legal", () => {
    expect(pestelForRegulation()).toBe("legal");
  });
});

describe("criteria and impact tables", () => {
  it("writes a criterion for each of the six factors", () => {
    expect(Object.keys(PESTEL_CRITERIA).sort()).toEqual(
      ["economic", "environmental", "legal", "political", "social", "technological"],
    );
  });

  it("marks a competitor contract as a threat", () => {
    expect(impactForRule("secop.competitor-new-contract.v1")).toBe("threat");
  });

  it("leaves own expiring contracts and TRM moves to be evaluated", () => {
    expect(impactForRule("secop.expiring-contract.v1")).toBe("to_evaluate");
    expect(impactForRule("trm.daily-move.v1")).toBe("to_evaluate");
    expect(IMPACT_BY_RULE["trm.daily-move.v1"].reason).toMatch(/exposición|dirección/i);
  });

  it("defaults unknown rules to to_evaluate", () => {
    expect(impactForRule("unknown.v1")).toBe("to_evaluate");
  });
});
