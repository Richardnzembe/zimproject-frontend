import React, { useState, useRef, useEffect, useCallback } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, getUserOpenRouterModel, ensureAuthUserId, authFetch, clearTokens } from "../lib/api";
import { getHistoryByUser, upsertHistoryItems, deleteHistoryItems, replaceUserHistory } from "../db";
import { normalizeOrderedListNumbering, renderMessageContent } from "../lib/chatFormatting";
import { PlusIcon, SendIcon, MenuIcon, ChevronLeftIcon, ChevronRightIcon, HomeIcon, NotesIcon, UserIcon, LogoutIcon, EditIcon, TrashIcon, LinkIcon, UsersIcon, CopyIcon, CheckIcon, BotIcon } from "../lib/icons";
import { USER_OPENROUTER_MODEL_STORAGE, AI_HEADER_VISIBILITY_STORAGE, FREE_OPENROUTER_MODELS, CHAT_MODES, normalizeChatMode, getChatModeLabel } from "../lib/constants";
import { flashStatus } from "../lib/utils";
import { createShareLink as createShareLinkApi, inviteUserToShare as inviteUserApi, removeMemberFromShare as removeMemberApi, revokeShareLink as revokeShareApi, fetchShareLinks as fetchShareLinksApi } from "../lib/sharing";
import { useClickOutside, useAutoResize } from "../lib/hooks";
import ImageToText from "./ImageToText";
import ThemeToggle from "./ThemeToggle";


export default function AIChat({ onNavigate }) {
  const [authToken, setAuthToken] = useState(getAuthToken());
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [draftSessionId, setDraftSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("general");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renameSessionId, setRenameSessionId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(() => {
    const stored = localStorage.getItem(AI_HEADER_VISIBILITY_STORAGE);
    if (stored === null) return true;
    return stored === "true";
  });
  const [shareStatus, setShareStatus] = useState("");
  const [modelStatus, setModelStatus] = useState("");
  const [shareInfoBySession, setShareInfoBySession] = useState({});
  const currentShare =
    shareInfoBySession[currentSessionId]?.find((s) => s.permission === "collab") ||
    shareInfoBySession[currentSessionId]?.[0];
  const currentMembers = currentShare?.members || [];
  const [lastFailedInput, setLastFailedInput] = useState(null);
  const [lastFailedMode, setLastFailedMode] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = (getUserOpenRouterModel() || "").trim();
    return stored || "auto";
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const modeMenuRef = useRef(null);

  function getWelcomeMessage() {
    return {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm NotesAI-RNA AI, your research and writing assistant. What would you like to work on today?",
      timestamp: new Date().toISOString(),
    };
  }

  function getSessionTitle(item) {
    const modeType = normalizeChatMode(item.mode || "general");
    const input = item.input_data || {};

    if (modeType === "research") {
      return input.question || input.notes || input.project_name || "Deep Research";
    } else if (modeType === "notes") {
      return input.note_content ? input.note_content.slice(0, 40) : "Notes Help";
    }
    return input.question || input.notes || "New Chat";
  }

  const startNewChat = useCallback(() => {
    const nextDraftSessionId = crypto.randomUUID();
    setDraftSessionId(nextDraftSessionId);
    setMode("general");
    setMessages([getWelcomeMessage()]);
    setCurrentSessionId(nextDraftSessionId);
    setDeleteConfirmId(null);
    setRenameSessionId(null);
    setRenameValue("");
    setShareStatus("");
    }, []);

  const formatInputData = useCallback((input_data) => {
    if (!input_data) return "";
    if (input_data.question) return input_data.question;
    if (input_data.notes) return input_data.notes;
    if (input_data.project_name) return input_data.project_name;
    return JSON.stringify(input_data);
  }, []);

  const fetchShareLinks = useCallback(async (sessionId, sessionKey) => {
    const info = await fetchShareLinksApi({
      resourceType: "chat",
      queryParams: { session_id: sessionKey },
    });
    if (info) {
      setShareInfoBySession((prev) => ({ ...prev, [sessionId]: info }));
    }
  }, []);

  const openSession = useCallback((session) => {
    setDraftSessionId(null);
    setCurrentSessionId(session.id);
    setMode(normalizeChatMode(session.mode || "general"));
    fetchShareLinks(session.id, session.input_data?.session_id || session.id);
    const currentUserId = getAuthUserId();

    const reconstructedMessages = [];
    session.items.forEach((item) => {
      const sharedBy = item?.input_data?.shared_by;
      const sharedById = item?.input_data?.shared_by_id;
      const isCurrentUser = currentUserId && sharedById && Number(sharedById) === Number(currentUserId);
      const senderName = sharedBy ? (isCurrentUser ? "You" : sharedBy) : "You";
      reconstructedMessages.push({
        id: item.local_id + "-user",
        role: "user",
        content: formatInputData(item.input_data),
        timestamp: item.created_at,
        senderName,
      });
      reconstructedMessages.push({
        id: item.local_id + "-assistant",
        role: "assistant",
        content: item.response_text,
        timestamp: item.created_at,
      });
    });

    if (reconstructedMessages.length === 0) {
      reconstructedMessages.push(getWelcomeMessage());
    }

    setMessages(reconstructedMessages);
  }, [fetchShareLinks, formatInputData]);

  function upsertChatSession(prevSessions, sessionId, sessionTitle, sessionMode, inputData, historyItem) {
    const existingIndex = prevSessions.findIndex((session) => session.id === sessionId);
    const nextSession = {
      id: sessionId,
      title: sessionTitle,
      mode: sessionMode,
      input_data: inputData,
      created_at: historyItem.created_at,
      items: [historyItem],
    };

    if (existingIndex === -1) {
      return [nextSession, ...prevSessions];
    }

    const existingSession = prevSessions[existingIndex];
    const resolvedTitle =
      existingSession.title && existingSession.title !== "New Chat"
        ? existingSession.title
        : sessionTitle;
    const resolvedInputData =
      existingSession.input_data && Object.keys(existingSession.input_data).length > 0
        ? existingSession.input_data
        : inputData;

    return [
      {
        ...existingSession,
        title: resolvedTitle,
        mode: sessionMode,
        input_data: resolvedInputData,
        created_at: historyItem.created_at,
        items: [...existingSession.items, historyItem],
      },
      ...prevSessions.filter((_, index) => index !== existingIndex),
    ];
  }

  const loadHistory = useCallback(async ({ preferRemote = false } = {}) => {
    const userId = getAuthUserId() || (await ensureAuthUserId());
    if (!userId) {
      setChatSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      return;
    }

    let historyItems = await getHistoryByUser(userId);

    if (preferRemote && navigator.onLine) {
      try {
        const res = await authFetch(`${getApiBaseUrl()}/api/ai/history/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json().catch(() => []);
          const serverItems = (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            local_id: `server-${item.id}`,
            server_id: item.id,
            user_id: userId,
          }));
          await replaceUserHistory(userId, serverItems);
          historyItems = serverItems;
        }
      } catch (err) {
        console.error("Failed to refresh history from server", err);
      }
    }

    const sorted = historyItems.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    const sessions = {};
    sorted.forEach((item) => {
      const key = item?.input_data?.session_id || JSON.stringify(item.input_data);
      if (!sessions[key]) {
        sessions[key] = {
          id: item?.input_data?.session_id || item.local_id || crypto.randomUUID(),
          title: getSessionTitle(item),
          mode: normalizeChatMode(item.mode),
          input_data: item.input_data,
          created_at: item.created_at,
          items: [],
        };
      }
      sessions[key].items.push(item);
    });

    const sessionList = Object.values(sessions).map((session) => {
      const items = [...session.items].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
      return { ...session, items };
    });
    setChatSessions(sessionList);

    if (sessionList.length > 0) {
      const activeSession = sessionList.find((session) => session.id === currentSessionId);
      if (activeSession) {
        openSession(activeSession);
      } else if (!(draftSessionId && currentSessionId === draftSessionId)) {
        openSession(sessionList[0]);
      }
    } else {
      if (!(draftSessionId && currentSessionId === draftSessionId)) {
        startNewChat();
      }
    }
  }, [currentSessionId, draftSessionId, openSession, startNewChat]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeModeMenu = useCallback(() => setModeMenuOpen(false), []);
  const closeHeaderMenu = useCallback(() => setHeaderMenuOpen(false), []);
  useClickOutside(modeMenuRef, closeModeMenu);
  useClickOutside(headerMenuRef, closeHeaderMenu);

  // Auth change listener
  useEffect(() => {
    const onAuthChange = () => setAuthToken(getAuthToken());
    window.addEventListener("auth-changed", onAuthChange);
    return () => window.removeEventListener("auth-changed", onAuthChange);
  }, []);

  // Load history when authenticated
  useEffect(() => {
    if (authToken) {
      loadHistory({ preferRemote: true });
    } else {
      setChatSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setDraftSessionId(null);
    }
  }, [authToken, loadHistory]);

  // Refresh when tab regains focus or network returns
  useEffect(() => {
    if (!authToken) return undefined;

    const refresh = () => {
      loadHistory({ preferRemote: true });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [authToken, currentSessionId, loadHistory]);

  useEffect(() => {
    localStorage.setItem(USER_OPENROUTER_MODEL_STORAGE, selectedModel);
  }, [selectedModel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize input as content grows
  useAutoResize(inputRef, input);
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
  }, [input]);


  const createShareLink = async (permission, sessionId = currentSessionId) => {
    if (!sessionId) return;
    const session = chatSessions.find((s) => s.id === sessionId);
    const sessionKey = session?.input_data?.session_id || sessionId;
    const historyIds =
      session?.items
        ?.map((item) => item?.server_id || (typeof item?.id === "number" ? item.id : null))
        .filter(Boolean) || [];
    const result = await createShareLinkApi({
      resourceType: "chat",
      permission,
      body: { session_id: sessionKey, history_ids: historyIds },
    });
    if (result.error) {
      setShareStatus(result.error);
      return;
    }
    setShareInfoBySession((prev) => ({
      ...prev,
      [sessionId]: [
        ...(prev[sessionId] || []).filter((s) => s.permission !== permission),
        result.data,
      ],
    }));
    await navigator.clipboard.writeText(result.url);
    flashStatus(setShareStatus, "Share link copied.");
  };

  const inviteUserToShare = async () => {
    const share = currentShare;
    if (!share?.token) return;
    const result = await inviteUserApi(share.token);
    if (result.error) {
      setShareStatus(result.error);
      return;
    }
    if (result.success) flashStatus(setShareStatus, "Invite sent.");
  };

  const removeMemberFromShare = async (shareToken, userId) => {
    if (!shareToken || !userId || !currentSessionId) return;
    const result = await removeMemberApi(shareToken, userId);
    if (result.error) {
      setShareStatus(result.error);
      return;
    }
    setShareInfoBySession((prev) => ({
      ...prev,
      [currentSessionId]: (prev[currentSessionId] || []).map((share) =>
        share.token === shareToken
          ? { ...share, members: (share.members || []).filter((m) => m.user?.id !== userId) }
          : share
      ),
    }));
    flashStatus(setShareStatus, "Member removed.");
  };

  const revokeShareLink = async () => {
    const share = currentShare;
    if (!share?.token || !currentSessionId) return;
    const result = await revokeShareApi(share.token);
    if (result.error) {
      setShareStatus(result.error);
      return;
    }
    setShareInfoBySession((prev) => ({
      ...prev,
      [currentSessionId]: (prev[currentSessionId] || []).filter((item) => item.token !== share.token),
    }));
    flashStatus(setShareStatus, "Share link revoked.");
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(normalizeOrderedListNumbering(text));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };


  const AI_REQUEST_TIMEOUT_MS = 45000;

  const formatAiError = (status, data, err) => {
    if (err?.name === "AbortError") {
      return "The request timed out. The server may be waking up — please try again in a moment.";
    }
    if (err?.message === "Failed to fetch" || err?.name === "TypeError") {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    if (status === 401 || status === 403) {
      return "Your session has expired. Please log in again to continue.";
    }
    if (status === 429) {
      return "Too many requests. Please wait a moment before trying again.";
    }
    if (status >= 500) {
      const detail = data?.detail || data?.error || "";
      return `Server error: ${detail || "The AI service is temporarily unavailable. Please try again shortly."}`;
    }
    const detail = data?.detail || data?.error || "";
    if (detail) return detail;
    if (status) return `Request failed (${status}). Please try again.`;
    return "Something went wrong. Please try again.";
  };

  const sendMessage = async (retryText = null) => {
    const messageText = retryText || input;
    if (!messageText.trim() || loading) return;

    const token = getAuthToken();
    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Please login to use the AI Helper.",
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    if (!retryText) {
      const userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
        senderName: "You",
      };
      setMessages((prev) => [...prev, userMessage]);
    }
    const messageToSend = messageText;
    if (!retryText) setInput("");
    setLoading(true);
    setModelStatus("");
    setLastFailedInput(null);
    setLastFailedMode(null);

    const addErrorMessage = (content, retryable = false) => {
      if (retryable) {
        setLastFailedInput(messageToSend);
        setLastFailedMode(mode);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
          isError: true,
          retryable,
        },
      ]);
    };

    try {
      const session = chatSessions.find((s) => s.id === currentSessionId);
      if (session?.items?.length) {
        const itemsToMigrate = session.items.filter(
          (item) => !item?.input_data?.session_id
        );
        if (itemsToMigrate.length) {
          const migrated = itemsToMigrate.map((item) => ({
            ...item,
            input_data: { ...(item.input_data || {}), session_id: currentSessionId },
          }));
          await upsertHistoryItems(migrated);
          setChatSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    items: s.items.map((item) =>
                      item?.input_data?.session_id
                        ? item
                        : {
                            ...item,
                            input_data: {
                              ...(item.input_data || {}),
                              session_id: currentSessionId,
                            },
                          }
                    ),
                  }
                : s
            )
          );
        }
      }

      const getEndpoint = () => {
        const buildHistory = () => {
          const history = [];
          messages.forEach((msg) => {
            if (msg.id === "welcome" || msg.isError) return;
            if (msg.role !== "user" && msg.role !== "assistant") return;
            history.push({ role: msg.role, content: msg.content });
          });
          return history.slice(-10);
        };
        const history = buildHistory();
        const base = getApiBaseUrl();
        const currentMode = retryText ? (lastFailedMode || mode) : mode;
        if (currentMode === "research") {
          return { url: `${base}/api/ai/research/`, body: { question: messageToSend, history, session_id: currentSessionId } };
        } else if (currentMode === "writing") {
          return { url: `${base}/api/ai/writing/`, body: { question: messageToSend, history, session_id: currentSessionId } };
        }
        return { url: `${base}/api/ai/general/`, body: { question: messageToSend, history, session_id: currentSessionId } };
      };

      const { url, body } = getEndpoint();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

      let res;
      try {
        res = await authFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMessage = data?.detail || data?.error || `AI request failed (${res.status})`;
        const retryable = data?.retryable !== false && (res.status >= 500 || res.status === 429);
        if (data?.request_message) {
          setModelStatus(data.request_message);
        }
        addErrorMessage(errorMessage, retryable);
      } else if (!data) {
        addErrorMessage("Received an empty response from the server. Please try again.", true);
        const errorMessage = formatAiError(res.status, data);
        if (data?.request_message) {
          setModelStatus(data.request_message);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-error",
            role: "assistant",
            isError: true,
            failedInput: messageToSend,
            content: errorMessage,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        if (data?.request_message) {
          setModelStatus(data.request_message);
        }
        const responseText = normalizeOrderedListNumbering(
          data.answer || data.result || data.project || JSON.stringify(data, null, 2)
        );
        const historyId = data?.history_id ?? null;
        const createdAt = new Date().toISOString();
        const localId = crypto.randomUUID();
        const userId = getAuthUserId() || (await ensureAuthUserId());
        const historyItem = {
          local_id: localId,
          user_id: userId || undefined,
          mode,
          input_data: body,
          response_text: responseText,
          created_at: createdAt,
          local_only: true,
          server_id: historyId || undefined,
        };
        const sessionTitle = messageToSend.slice(0, 40) || "New Chat";

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-response",
            role: "assistant",
            content: responseText,
            timestamp: createdAt,
          },
        ]);

        setChatSessions((prev) =>
          upsertChatSession(prev, currentSessionId, sessionTitle, mode, body, historyItem)
        );
        if (draftSessionId === currentSessionId) {
          setDraftSessionId(null);
        }

        if (userId) {
          await upsertHistoryItems([{ ...historyItem, user_id: userId }]);
        }
      }
    } catch (err) {
      console.error(err);
      const isNetworkError = !navigator.onLine || err?.message === "Failed to fetch";
      if (isNetworkError) {
        addErrorMessage("You appear to be offline. Check your connection and try again.", true);
      } else {
        addErrorMessage("Something went wrong. Please try again.", true);
      }
      const errorMessage = formatAiError(null, null, err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          role: "assistant",
          isError: true,
          failedInput: messageToSend,
          content: errorMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
  };

  const retryLastMessage = (failedInput) => {
    if (typeof failedInput === "string") {
      setMessages((prev) => prev.filter((m) => !(m.isError && m.failedInput === failedInput)));
      setInput(failedInput);
      return;
    }
    if (!lastFailedInput || loading) return;
    setMessages((prev) => prev.filter((m) => !m.isError));
    sendMessage(lastFailedInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertExtractedText = (text) => {
    if (!text) return;
    setInput((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const requestDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(sessionId);
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmId(null);

    const session = chatSessions.find((s) => s.id === sessionId);
    if (session?.items?.length) {
      await deleteHistoryItems(session.items.map((item) => item.local_id));

      const token = getAuthToken();
      if (token) {
        const serverIds = new Set(
          session.items
            .map((item) => item?.server_id || (typeof item?.id === "number" ? item.id : null))
            .filter(Boolean)
        );

        if (serverIds.size > 0) {
          for (const id of serverIds) {
            try {
              await authFetch(`${getApiBaseUrl()}/api/ai/history/${id}/delete/`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              });
            } catch (err) {
              console.error("Failed to delete server history item", err);
            }
          }
        }
      }
    }

    setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));

    if (sessionId === currentSessionId) {
      startNewChat();
    }
  };

  const startRename = (session, e) => {
    e.stopPropagation();
    e.preventDefault();
    setRenameSessionId(session.id);
    setRenameValue(session.title);
  };

  const saveRename = (sessionId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (renameValue.trim()) {
      setChatSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: renameValue.trim() } : s))
      );
    }
    setRenameSessionId(null);
    setRenameValue("");
  };

  const cancelRename = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setRenameSessionId(null);
    setRenameValue("");
  };

  const handleLogout = () => {
    clearTokens();
    window.dispatchEvent(new Event("auth-changed"));
  };

  const getModeDescription = () => {
    switch (mode) {
      case "general":
        return "Ask any question";
      case "research":
        return "Get a deeper, more structured analysis";
      case "writing":
        return "Draft, rewrite, or polish text";
      default:
        return "";
    }
  };

  const isDraftSession = Boolean(draftSessionId && currentSessionId === draftSessionId);
  const isNewChat =
    isDraftSession && messages.length === 1 && messages[0]?.id === "welcome";
  const draftSessionTitle =
    messages.find((message) => message.role === "user")?.content?.slice(0, 40) || "New Chat";
  const sidebarSessions =
    isDraftSession && currentSessionId
      ? [{ id: currentSessionId, title: draftSessionTitle, isDraft: true }, ...chatSessions]
      : chatSessions;
  const modelOptions = FREE_OPENROUTER_MODELS.some((option) => option.value === selectedModel)
    ? FREE_OPENROUTER_MODELS
    : [...FREE_OPENROUTER_MODELS, { value: selectedModel, label: `Custom (${selectedModel})` }];

  return (
    <div
      className="ai-chat"
      style={{
        "--ai-offset": sidebarOpen && !isMobile ? "260px" : "0px",
      }}
    >
      {/* Sidebar */}
      <aside className={`ai-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span>NotesAI-RNA AI</span>
          </div>
          <button className="sidebar-new-chat" onClick={startNewChat}>
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-content">
          {sidebarSessions.length === 0 ? (
            <div className="sidebar-empty">
              No chat history yet
            </div>
          ) : (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Recent Chats</div>
              {sidebarSessions.map((session) => (
                <div
                  key={session.id}
                  className={`sidebar-chat-item ${session.id === currentSessionId ? "active" : ""}`}
                  onClick={() => {
                    if (!session.isDraft) {
                      openSession(session);
                    }
                  }}
                >
                  {renameSessionId === session.id ? (
                    <input
                      type="text"
                      className="sidebar-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={(e) => saveRename(session.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(session.id, e);
                        if (e.key === "Escape") cancelRename(e);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="sidebar-chat-item-title">{session.title}</span>
                      {session.isDraft ? null : deleteConfirmId === session.id ? (
                        <div className="sidebar-delete-confirm">
                          <button onClick={(e) => deleteSession(session.id, e)} title="Confirm delete">
                            Confirm
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDeleteConfirmId(null);
                            }}
                            title="Cancel delete"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="sidebar-chat-actions">
                          <button onClick={(e) => { e.stopPropagation(); createShareLink("read", session.id); }} title="Share">
                            <LinkIcon />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); createShareLink("collab", session.id); }} title="Collaborate">
                            <UsersIcon />
                          </button>
                          <button onClick={(e) => startRename(session, e)} title="Rename">
                            <EditIcon />
                          </button>
                          <button onClick={(e) => requestDeleteSession(session.id, e)} title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="sidebar-footer">
          <nav className="sidebar-nav">
            <button className="sidebar-nav-item" onClick={() => onNavigate && onNavigate("home")}>
              <HomeIcon />
              <span>Home</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => onNavigate && onNavigate("notes")}>
              <NotesIcon />
              <span>Notes</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => onNavigate && onNavigate("shares")}>
              <UsersIcon />
              <span>Shares</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => onNavigate && onNavigate("account")}>
              <UserIcon />
              <span>Account</span>
            </button>
            <button className="sidebar-nav-item sidebar-nav-logout" onClick={handleLogout}>
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`ai-sidebar-overlay ${sidebarOpen && isMobile ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main
        className={`ai-main ${headerVisible ? "" : "header-hidden"} ${sidebarOpen && !isMobile ? "sidebar-shifted" : ""}`}
      >
        {/* Header with toggle button */}
        {headerVisible && (
          <header className="ai-header">
            <button
              className="ai-header-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              type="button"
            >
              {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </button>
            
            <div className="ai-header-actions">
              <div className="ai-header-model-wrap">
                <span className="ai-header-model-label">Model</span>
                <select
                  className="ai-header-model-select"
                  value={selectedModel}
                  onChange={(e) => {
                    const nextModel = e.target.value;
                    setSelectedModel(nextModel);
                    localStorage.setItem(USER_OPENROUTER_MODEL_STORAGE, nextModel);
                  }}
                  title="Select model"
                  aria-label="Select OpenRouter model"
                >
                  {modelOptions.map((modelOption) => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <ThemeToggle compact iconOnly />
              <div ref={headerMenuRef} className="ai-header-menu-wrap">
                <button
                  className="theme-toggle compact"
                  onClick={() => setHeaderMenuOpen((prev) => !prev)}
                  aria-expanded={headerMenuOpen}
                  aria-label="Open header actions"
                  type="button"
                >
                  Menu
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {headerMenuOpen && (
                  <div className="mode-dropdown-menu ai-header-dropdown">
                    <button
                      onClick={() => {
                        createShareLink("read", currentSessionId);
                        setHeaderMenuOpen(false);
                      }}
                      disabled={isDraftSession}
                      title="Share read-only link"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => {
                        createShareLink("collab", currentSessionId);
                        setHeaderMenuOpen(false);
                      }}
                      disabled={isDraftSession}
                      title="Create collaboration link"
                    >
                      Collaborate
                    </button>
                    <button
                      onClick={() => {
                        setHeaderVisible(false);
                        localStorage.setItem(AI_HEADER_VISIBILITY_STORAGE, "false");
                        setHeaderMenuOpen(false);
                      }}
                    >
                      Hide top bar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        {!headerVisible && (
          <button
            className="ai-header-restore"
            type="button"
            aria-label="Show top bar"
            onClick={() => {
              setHeaderVisible(true);
              localStorage.setItem(AI_HEADER_VISIBILITY_STORAGE, "true");
            }}
          >
            Show top bar
            <ChevronRightIcon />
          </button>
        )}
        {shareStatus && (
          <div className="ai-status-bar">
            {shareStatus}
          </div>
        )}
        {modelStatus && (
          <div className="ai-status-bar">
            {modelStatus}
          </div>
        )}
        {currentMembers.length > 0 && (
          <div className="ai-status-bar">
            Collaborators:
            <div className="ai-collaborators">
              {currentMembers.map((member) => (
                <span key={member.user?.id || member.user?.username} className="tag ai-collab-tag">
                  {member.user?.username}
                  {member.user?.id && currentShare?.token && (
                    <button
                      className="button-secondary ai-collab-remove"
                      onClick={() => removeMemberFromShare(currentShare.token, member.user.id)}
                    >
                      Remove
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        {currentShare?.token && (
          <div className="ai-share-actions">
            <button className="theme-toggle compact" onClick={inviteUserToShare}>
              Add user
            </button>
            <button className="theme-toggle compact" onClick={revokeShareLink}>
              Revoke link
            </button>
          </div>
        )}

        {/* Chat messages */}
        <div className="ai-messages">
          {isNewChat && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <h2 className="ai-welcome-title">How can I help you today?</h2>
              <p className="ai-welcome-subtitle">Choose a mode to get started, or just type your question below.</p>
              <div className="ai-welcome-modes">
                {CHAT_MODES.map((item) => (
                  <button
                    key={item.value}
                    className={`ai-welcome-mode-btn ${mode === item.value ? "active" : ""}`}
                    onClick={() => setMode(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="ai-welcome-mode-desc">{getModeDescription()}</p>
              <div className="ai-welcome-suggestions">
                <button className="ai-suggestion-chip" onClick={() => { setInput("Explain the concept of photosynthesis"); inputRef.current?.focus(); }}>
                  Explain a concept
                </button>
                <button className="ai-suggestion-chip" onClick={() => { setInput("Help me write a study plan for my exams"); inputRef.current?.focus(); }}>
                  Create a study plan
                </button>
                <button className="ai-suggestion-chip" onClick={() => { setInput("Summarize the key points of my notes"); inputRef.current?.focus(); }}>
                  Summarize notes
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => {
            return (
              <div key={message.id} className={`ai-message ${message.role}${message.isError ? " ai-message-error" : ""}`}>
                <div className="ai-message-inner">
                  <div className={`ai-message-avatar${message.isError ? " error" : ""}`}>
                    {message.isError ? (
                      <AlertIcon />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                        {message.role === "user" ? (
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        ) : message.isError ? (
                          <circle cx="12" cy="12" r="10"></circle>
                        ) : (
                          <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                        )}
                        {message.role === "user" ? (
                          <circle cx="12" cy="7" r="4"></circle>
                        ) : message.isError ? (
                          <>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </>
                        ) : (
                          <>
                            <path d="M12 8v8"></path>
                            <path d="M8 12h8"></path>
                          </>
                        )}
                      </svg>
                    )}
                  </div>
                  <div className="ai-message-body">
                    <div className="ai-message-name">
                      {message.role === "user" ? (message.senderName || "You") : message.isError ? "Error" : "NotesAI-RNA AI"}
                    </div>
                    <div className="chat-message-text">
                      {message.isError ? message.content : message.role === "assistant" ? renderMessageContent(message.content) : message.content}
                    </div>
                    {message.role === "assistant" && message.isError && (
                      <div className="ai-message-actions" style={{ opacity: 1 }}>
                        {message.retryable && (
                          <button onClick={retryLastMessage} className="ai-retry-button" disabled={loading}>
                            <RetryIcon /> Retry
                          </button>
                        )}
                        {message.isError && message.failedInput && (
                          <div className="ai-message-actions">
                            <button onClick={() => retryLastMessage(message.failedInput)} className="ai-retry-button" disabled={loading}>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                              </svg>
                              {" Retry"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {message.role === "assistant" && !message.isError && (
                      <div className="ai-message-actions">
                        <button onClick={() => copyToClipboard(message.content, message.id)} className="ai-copy-button">
                          {copiedId === message.id ? <CheckIcon /> : <CopyIcon />}
                          {copiedId === message.id ? " Copied" : " Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="ai-typing">
              <div className="ai-message-avatar">
                <BotIcon />
              </div>
              <div className="ai-typing-dots">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className={`ai-composer ${sidebarOpen && !isMobile ? "sidebar-shifted" : ""}`}>
          <div className="ai-composer-inner">
            <textarea
              ref={inputRef}
              className="ai-composer-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NotesAI-RNA AI..."
              rows={1}
            />
            <div className="ai-composer-actions" ref={modeMenuRef}>
              <ImageToText onExtract={insertExtractedText} variant="icon" showStatus={false} className="ai-image-import" />
              <div className="ai-mode-wrap">
                <button
                  className="ai-mode-button"
                  onClick={() => setModeMenuOpen((prev) => !prev)}
                  title="Choose mode"
                  type="button"
                >
                  {getChatModeLabel(mode)}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {modeMenuOpen && (
                  <div className="mode-dropdown-menu mode-main-menu ai-mode-menu">
                    {CHAT_MODES.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setMode(item.value);
                          setModeMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`ai-send-button ${input.trim() && !loading ? "active" : "disabled"}`}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

