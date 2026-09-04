import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  TEMPLATES,
  TEMPLATE_COOKIE,
  parseTemplate,
  templateById,
} from "@/config/templates";

describe("parseTemplate", () => {
  it("mengembalikan id yang dikenal apa adanya", () => {
    expect(parseTemplate("adminly")).toBe("adminly");
  });

  it("jatuh ke DEFAULT_TEMPLATE untuk nilai asing, kosong, undefined, null", () => {
    expect(parseTemplate("tidak-ada")).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate("")).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate(undefined)).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate(null)).toBe(DEFAULT_TEMPLATE);
  });
});

describe("templateById", () => {
  it("mengembalikan definisi yang cocok", () => {
    expect(templateById("adminly").shell).toBe("sidebar");
  });

  it("jatuh ke template default untuk id asing", () => {
    expect(templateById("tidak-ada").id).toBe(DEFAULT_TEMPLATE);
  });
});

describe("registry", () => {
  it("punya id unik", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEFAULT_TEMPLATE benar-benar terdaftar", () => {
    expect(TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE)).toBe(true);
  });

  it("memakai nama cookie yang sama dengan preferensi lain", () => {
    expect(TEMPLATE_COOKIE).toBe("adminly_template");
  });
});
