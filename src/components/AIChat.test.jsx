import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AIChat from "./AIChat";
import { authFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  getApiBaseUrl: () => "http://localhost:8000",
  getAuthToken: () => true,
  getAuthUserId: () => 1,
  ensureAuthUserId: async () => 1,
  getUserOpenRouterModel: () => "",
  authFetch: vi.fn(),
  clearTokens: vi.fn(),
}));
vi.mock("../db", () => ({
  getHistoryByUser: async () => [],
  upsertHistoryItems: vi.fn(),
  deleteHistoryItems: vi.fn(),
  replaceUserHistory: vi.fn(),
}));
vi.mock("./ImageToText", () => ({ default: () => null }));
vi.mock("./ThemeToggle", () => ({ default: () => null }));

describe("AI request connection failures", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    Element.prototype.scrollIntoView = vi.fn();
    authFetch.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps an offline message in chat and retries it when connected", async () => {
    const onNavigate = vi.fn();
    render(<AIChat onNavigate={onNavigate} />);
    const composer = screen.getByPlaceholderText("Ask NotesAI-RNA AI...");
    await screen.findByText("How can I help you today?");
    fireEvent.change(composer, { target: { value: "Explain gravity" } });
    fireEvent.keyDown(composer, { key: "Enter" });

    expect(await screen.findByText(/No internet connection/)).toBeInTheDocument();
    expect(screen.getAllByText(/No internet connection/)).toHaveLength(1);
    expect(screen.getByText("Explain gravity", { selector: ".chat-message-text" })).toBeInTheDocument();
    expect(authFetch).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Learn more/ })).toHaveAttribute("href", "#help/ai");

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    authFetch.mockResolvedValue({ ok: true, json: async () => ({ answer: "Gravity attracts objects." }) });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Gravity attracts objects.")).toBeInTheDocument();
    expect(screen.getAllByText("Explain gravity", { selector: ".chat-message-text" })).toHaveLength(1);
    expect(screen.queryByText(/No internet connection/)).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("shows one retryable error if the connection drops during a request", async () => {
    render(<AIChat onNavigate={vi.fn()} />);
    await screen.findByText("How can I help you today?");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    authFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const composer = screen.getByPlaceholderText("Ask NotesAI-RNA AI...");
    fireEvent.change(composer, { target: { value: "Explain gravity" } });
    fireEvent.keyDown(composer, { key: "Enter" });
    await waitFor(() => expect(screen.getAllByText(/Could not reach the server/)).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(composer).toBeInTheDocument();
  });
});
