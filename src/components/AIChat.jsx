import React, { useState, useRef, useEffect } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, getUserOpenRouterModel, ensureAuthUserId, authFetch, clearTokens } from "../lib/api";
import { getHistoryByUser, upsertHistoryItems, deleteHistoryItems, replaceUserHistory } from "../db";
import { normalizeOrderedListNumbering, renderMessageContent } from "../lib/chatFormatting";
import ImageToText from "./ImageToText";
import ThemeToggle from "./ThemeToggle";

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const NotesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1"></path>
    <path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"></path>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const RetryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
);

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <rect x="2" y="2" width="20" height="20" rx="2"></rect>
    <path d="M12 8v8"></path>
    <path d="M8 12h8"></path>
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const USER_OPENROUTER_MODEL_STORAGE = "NotesAI-RNA_openrouter_model";
const AI_HEADER_VISIBILITY_STORAGE = "NotesAI-RNA_ai_header_visible";
const FREE_OPENROUTER_MODELS = [
  { value: "auto", label: "Auto (OpenRouter default)" },
  { value: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct (Free)" },
  { value: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B Instruct (Free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Instruct (Free)" },
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
];
const CHAT_MODES = [
  { value: "general", label: "General", description: "Quick answers and everyday help." },
  { value: "research", label: "Deep Research", description: "Structured analysis, tradeoffs, and deeper reasoning." },
  { value: "writing", label: "Writing", description: "Draft, rewrite, and polish text clearly." },
];

const normalizeChatMode = (value) => {
  if (value === "study" || value === "project") {
    return "research";
  }
  if (value === "writing" || value === "research" || value === "general") {
    return value;
  }
  return "general";
};

const getChatModeLabel = (value) =>
  CHAT_MODES.find((item) => item.value === normalizeChatMode(value))?.label || "General";

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

  function startNewChat() {
    const nextDraftSessionId = crypto.randomUUID();
    setDraftSessionId(nextDraftSessionId);
    setMode("general");
    setMessages([getWelcomeMessage()]);
    setCurrentSessionId(nextDraftSessionId);
    setDeleteConfirmId(null);
    setRenameSessionId(null);
    setRenameValue("");
    setShareStatus("");
  }

  function openSession(session) {
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
  }

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

  async function loadHistory({ preferRemote = false } = {}) {
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
  }

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

  useEffect(() => {
    const closeModeMenuOnOutsideClick = (event) => {
      const clickedInsideMode =
        modeMenuRef.current && modeMenuRef.current.contains(event.target);
      if (!clickedInsideMode) {
        setModeMenuOpen(false);
      }
    };

    const closeModeMenuOnEscape = (event) => {
      if (event.key === "Escape") {
        setModeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeModeMenuOnOutsideClick);
    document.addEventListener("keydown", closeModeMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeModeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeModeMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!headerMenuRef.current) return;
      if (!headerMenuRef.current.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setHeaderMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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
  }, [authToken]);

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
  }, [authToken, currentSessionId]);

  useEffect(() => {
    localStorage.setItem(USER_OPENROUTER_MODEL_STORAGE, selectedModel);
  }, [selectedModel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize input as content grows
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
  }, [input]);

  const fetchShareLinks = async (sessionId, sessionKey) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await authFetch(
        `${getApiBaseUrl()}/api/share/links/?resource_type=chat&session_id=${encodeURIComponent(sessionKey)}`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        console.warn("Failed to fetch share links for session:", sessionId, res.status);
        return;
      }
      const info = Array.isArray(data) ? data : [];
      setShareInfoBySession((prev) => ({ ...prev, [sessionId]: info }));
    } catch (err) {
      console.warn("Failed to fetch share links:", err);
    }
  };

  const createShareLink = async (permission, sessionId = currentSessionId) => {
    if (!sessionId) return;
    const session = chatSessions.find((s) => s.id === sessionId);
    const sessionKey = session?.input_data?.session_id || sessionId;
    try {
      const historyIds =
        session?.items
          ?.map((item) => item?.server_id || (typeof item?.id === "number" ? item.id : null))
          .filter(Boolean) || [];
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "chat",
          session_id: sessionKey,
          history_ids: historyIds,
          permission,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to create share link.");
        return;
      }
      setShareInfoBySession((prev) => ({
        ...prev,
        [sessionId]: [
          ...(prev[sessionId] || []).filter((s) => s.permission !== permission),
          data,
        ],
      }));
      const url = `${window.location.origin}?share=${data.token}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to create share link.");
    }
  };

  const inviteUserToShare = async () => {
    const share = currentShare;
    if (!share?.token) return;
    const username = window.prompt("Enter username to invite:");
    if (!username) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${share.token}/invite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to send invite.");
        return;
      }
      setShareStatus("Invite sent.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to send invite.");
    }
  };

  const removeMemberFromShare = async (shareToken, userId) => {
    if (!shareToken || !userId || !currentSessionId) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${shareToken}/members/${userId}/`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to remove member.");
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
      setShareStatus("Member removed.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to remove member.");
    }
  };

  const revokeShareLink = async () => {
    const share = currentShare;
    if (!share?.token || !currentSessionId) return;
    try {
      const res = await authFetch(`${getApiBaseUrl()}/api/share/links/${share.token}/revoke/`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setShareStatus(data?.detail || "Unable to revoke share link.");
        return;
      }
      setShareInfoBySession((prev) => ({
        ...prev,
        [currentSessionId]: (prev[currentSessionId] || []).filter((item) => item.token !== share.token),
      }));
      setShareStatus("Share link revoked.");
      setTimeout(() => setShareStatus(""), 2500);
    } catch {
      setShareStatus("Unable to revoke share link.");
    }
  };

  const formatInputData = (input_data) => {
    if (!input_data) return "";
    if (input_data.question) return input_data.question;
    if (input_data.notes) return input_data.notes;
    if (input_data.project_name) return input_data.project_name;
    return JSON.stringify(input_data);
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

  const sendMessage = async (retryText = null) => {
    const messageText = retryText || input;
    if (!messageText.trim() || loading) return;
  const getEndpointAndBody = () => {
    const buildHistory = () => {
      const history = [];
      messages.forEach((msg) => {
        if (msg.id === "welcome") return;
        if (msg.role !== "user" && msg.role !== "assistant") return;
        history.push({ role: msg.role, content: msg.content });
      });
      return history.slice(-10);
    };

    const history = buildHistory();
    if (mode === "general") {
      return {
        url: `${getApiBaseUrl()}/api/ai/general/`,
        body: { question: input, history, session_id: currentSessionId },
      };
    } else if (mode === "research") {
      return {
        url: `${getApiBaseUrl()}/api/ai/research/`,
        body: { question: input, history, session_id: currentSessionId },
      };
    } else if (mode === "writing") {
      return {
        url: `${getApiBaseUrl()}/api/ai/writing/`,
        body: { question: input, history, session_id: currentSessionId },
      };
    }
    return {
      url: `${getApiBaseUrl()}/api/ai/general/`,
      body: { question: input, history, session_id: currentSessionId },
    };
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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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
      } else if (!data) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-error",
            role: "assistant",
            isError: true,
            failedInput: messageToSend,
            content: "Received an empty response from the server. Please try again.",
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

  const retryLastMessage = () => {
    if (!lastFailedInput || loading) return;
    setMessages((prev) => prev.filter((m) => !m.isError));
    sendMessage(lastFailedInput);
  const retryLastMessage = (failedInput) => {
    setMessages((prev) => prev.filter((m) => !(m.isError && m.failedInput === failedInput)));
    setInput(failedInput);
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
  const currentShare =
    shareInfoBySession[currentSessionId]?.find((s) => s.permission === "collab") ||
    shareInfoBySession[currentSessionId]?.[0];
  const currentMembers = currentShare?.members || [];
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

          {messages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role}${message.isError ? " error" : ""}`}>
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
                  {message.isError
                    ? message.content
                    : message.role === "assistant"
                      ? renderMessageContent(message.content)
                      : message.content}
                </div>
                {message.role === "assistant" && message.isError && (
                  <div className="ai-message-actions" style={{ opacity: 1 }}>
                    {message.retryable && (
                      <button
                        onClick={retryLastMessage}
                        className="ai-retry-button"
                        disabled={loading}
                      >
                        <RetryIcon /> Retry
                      </button>
                    )}
                {message.isError && message.failedInput && (
                  <div className="ai-message-actions">
                    <button
                      onClick={() => retryLastMessage(message.failedInput)}
                      className="ai-retry-button"
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      {" Retry"}
                    </button>
                  </div>
                )}
                {message.role === "assistant" && !message.isError && (
                  <div className="ai-message-actions">
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="ai-copy-button"
                    >
                      {copiedId === message.id ? <CheckIcon /> : <CopyIcon />}
                      {copiedId === message.id ? " Copied" : " Copy"}
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          ))}

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





