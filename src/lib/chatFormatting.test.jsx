import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  normalizeOrderedListNumbering,
  renderMessageContent,
} from "./chatFormatting";

describe("normalizeOrderedListNumbering", () => {
  it("returns empty string for empty input", () => {
    expect(normalizeOrderedListNumbering("")).toBe("");
  });

  it("returns empty string for null/undefined input", () => {
    expect(normalizeOrderedListNumbering(null)).toBe("");
    expect(normalizeOrderedListNumbering(undefined)).toBe("");
  });

  it("passes through plain text unchanged", () => {
    const text = "Hello world\nThis is a paragraph.";
    expect(normalizeOrderedListNumbering(text)).toBe(text);
  });

  it("re-numbers consecutive ordered list items starting from their first number", () => {
    const input = "1. First\n3. Second\n7. Third";
    const expected = "1. First\n2. Second\n3. Third";
    expect(normalizeOrderedListNumbering(input)).toBe(expected);
  });

  it("preserves numbering inside code fences", () => {
    const input = "```\n1. First\n5. Not renumbered\n```";
    expect(normalizeOrderedListNumbering(input)).toBe(input);
  });

  it("handles nested ordered lists with different indentation", () => {
    const input = "1. Top\n  1. Nested\n  5. Nested 2\n2. Top 2";
    const expected = "1. Top\n  1. Nested\n  2. Nested 2\n2. Top 2";
    expect(normalizeOrderedListNumbering(input)).toBe(expected);
  });

  it("resets counters after a heading", () => {
    const input = "1. Item\n2. Item\n# Heading\n5. New list";
    const expected = "1. Item\n2. Item\n# Heading\n5. New list";
    expect(normalizeOrderedListNumbering(input)).toBe(expected);
  });

  it("leaves bullet lists unchanged", () => {
    const input = "- One\n- Two\n- Three";
    expect(normalizeOrderedListNumbering(input)).toBe(input);
  });

  it("handles closing parenthesis style (1) items)", () => {
    const input = "1) First\n5) Second\n9) Third";
    const expected = "1) First\n2) Second\n3) Third";
    expect(normalizeOrderedListNumbering(input)).toBe(expected);
  });
});

describe("renderMessageContent", () => {
  it("renders null/empty text without crashing", () => {
    const { container } = render(renderMessageContent(null));
    expect(container.querySelector(".chat-format")).toBeInTheDocument();
  });

  it("renders a paragraph from plain text", () => {
    const { container } = render(renderMessageContent("Hello world"));
    const p = container.querySelector("p");
    expect(p).toBeInTheDocument();
    expect(p.textContent).toBe("Hello world");
  });

  it("renders headings", () => {
    const { container } = render(renderMessageContent("## My Heading"));
    const h2 = container.querySelector("h2");
    expect(h2).toBeInTheDocument();
    expect(h2.textContent).toBe("My Heading");
  });

  it("renders ordered lists", () => {
    const text = "1. First item\n2. Second item\n3. Third item";
    const { container } = render(renderMessageContent(text));
    const ol = container.querySelector("ol");
    expect(ol).toBeInTheDocument();
    const items = ol.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("First item");
  });

  it("renders unordered lists", () => {
    const text = "- Alpha\n- Beta\n- Gamma";
    const { container } = render(renderMessageContent(text));
    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    const items = ul.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[1].textContent).toBe("Beta");
  });

  it("renders bold text with **", () => {
    const { container } = render(renderMessageContent("This is **bold** text"));
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong.textContent).toBe("bold");
  });

  it("handles mixed content (headings, paragraphs, lists)", () => {
    const text = "# Title\n\nSome intro text.\n\n1. Step one\n2. Step two";
    const { container } = render(renderMessageContent(text));
    expect(container.querySelector("h2")).toBeInTheDocument();
    expect(container.querySelector("p")).toBeInTheDocument();
    expect(container.querySelector("ol")).toBeInTheDocument();
  });

  it("normalizes label patterns like Explanation: into bold labels", () => {
    const text = "Explanation: This is the answer.";
    const { container } = render(renderMessageContent(text));
    const strong = container.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong.textContent).toBe("Explanation:");
  });
});
