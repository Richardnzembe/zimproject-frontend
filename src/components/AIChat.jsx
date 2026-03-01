import React, { useState, useRef, useEffect } from "react";
import { getApiBaseUrl, getAuthToken, getAuthUserId, getUserOpenRouterModel, authFetch, clearTokens } from "../lib/api";
import { getHistoryByUser, upsertHistoryItems, deleteHistoryItems, replaceUserHistory } from "../db";
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

const USER_OPENROUTER_MODEL_STORAGE = "notex_openrouter_model";
const FREE_OPENROUTER_MODELS = [
  { value: "auto", label: "Auto (OpenRouter default)" },
  { value: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct (Free)" },
  { value: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B Instruct (Free)" },
  { value: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Instruct (Free)" },
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
];

export default function AIChat({ onNavigate }) {
  const [authToken, setAuthToken] = useState(getAuthToken());
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("general");
  const [projectMode, setProjectMode] = useState("guided");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renameSessionId, setRenameSessionId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [projectOptionsOpen, setProjectOptionsOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [modelStatus, setModelStatus] = useState("");
  const [shareInfoBySession, setShareInfoBySession] = useState({});
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = (getUserOpenRouterModel() || "").trim();
    return stored || "auto";
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const modeMenuRef = useRef(null);

  function getSessionTitle(item) {
    const modeType = item.mode || "general";
    const input = item.input_data || {};

    if (modeType === "project") {
      return input.project_name || "Project Help";
    } else if (modeType === "study") {
      return input.notes ? input.notes.slice(0, 40) : "Study Help";
    } else if (modeType === "notes") {
      return input.note_content ? input.note_content.slice(0, 40) : "Notes Help";
    }
    return input.question || input.notes || "New Chat";
  }

  function startNewChat() {
    const newSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      mode: "general",
      input_data: {},
      created_at: new Date().toISOString(),
      items: [],
    };

    setMode("general");
    setProjectMode("guided");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Notex AI, your AI study assistant. You can ask me questions, get help with your notes, summarize content, or work on projects. How can I help you today?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setCurrentSessionId(newSession.id);
    setChatSessions((prev) => [newSession, ...prev]);
  }

  function openSession(session) {
    setCurrentSessionId(session.id);
    setMode(session.mode || "general");
    fetchShareLinks(session.id, session.input_data?.session_id || session.id);

    const reconstructedMessages = [];
    session.items.forEach((item) => {
      reconstructedMessages.push({
        id: item.local_id + "-user",
        role: "user",
        content: formatInputData(item.input_data),
        timestamp: item.created_at,
      });
      reconstructedMessages.push({
        id: item.local_id + "-assistant",
        role: "assistant",
        content: item.response_text,
        timestamp: item.created_at,
      });
    });

    if (reconstructedMessages.length === 0) {
      reconstructedMessages.push({
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Notex AI, your AI study assistant. You can ask me questions, get help with your notes, summarize content, or work on projects. How can I help you today?",
        timestamp: new Date().toISOString(),
      });
    }

    setMessages(reconstructedMessages);
  }

  async function loadHistory({ preferRemote = false } = {}) {
    const userId = getAuthUserId();
    if (!userId) return;

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
          mode: item.mode,
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
      const activeSession =
        sessionList.find((session) => session.id === currentSessionId) || sessionList[0];
      openSession(activeSession);
    } else {
      startNewChat();
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
      if (!modeMenuRef.current) return;
      if (!modeMenuRef.current.contains(event.target)) {
        setModeMenuOpen(false);
        setProjectOptionsOpen(false);
      }
    };

    const closeModeMenuOnEscape = (event) => {
      if (event.key === "Escape") {
        setModeMenuOpen(false);
        setProjectOptionsOpen(false);
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
    if (!modeMenuOpen) {
      setProjectOptionsOpen(false);
      return;
    }
    if (mode === "project") {
      setProjectOptionsOpen(true);
    }
  }, [modeMenuOpen, mode]);

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
      if (!res.ok) return;
      const info = Array.isArray(data) ? data : [];
      setShareInfoBySession((prev) => ({ ...prev, [sessionId]: info }));
    } catch {
      // ignore
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
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
    } else if (mode === "study") {
      return {
        url: `${getApiBaseUrl()}/api/ai/study/`,
        body: { notes: input, task: "explain", history, session_id: currentSessionId },
      };
    } else if (mode === "project") {
      return {
        url: `${getApiBaseUrl()}/api/ai/project/`,
        body: { mode: projectMode, project_name: input, history, session_id: currentSessionId },
      };
    }
    return {
      url: `${getApiBaseUrl()}/api/ai/general/`,
      body: { question: input, history, session_id: currentSessionId },
    };
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

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    setLoading(true);
    setModelStatus("");

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

      const { url, body } = getEndpointAndBody();

      const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data?.detail || data?.error || "AI request failed";
        if (data?.request_message) {
          setModelStatus(data.request_message);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-error",
            role: "assistant",
            content: `Error: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        if (data?.request_message) {
          setModelStatus(data.request_message);
        }
        const responseText =
          data.answer || data.result || data.project || JSON.stringify(data, null, 2);
        const historyId = data?.history_id ?? null;

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "-response",
            role: "assistant",
            content: responseText,
            timestamp: new Date().toISOString(),
          },
        ]);

        if (messages.length === 1 && messages[0].id === "welcome") {
          setChatSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, title: messageToSend.slice(0, 40), mode }
                : s
            )
          );
        }

        const userId = getAuthUserId();
        if (userId) {
          const localId = crypto.randomUUID();
          await upsertHistoryItems([
            {
              local_id: localId,
              user_id: userId,
              mode,
              input_data: body,
              response_text: responseText,
              created_at: new Date().toISOString(),
              local_only: true,
              server_id: historyId || undefined,
            },
          ]);

          setChatSessions((prev) =>
            prev.map((s) => {
              if (s.id === currentSessionId) {
                return {
                  ...s,
                  items: [
                    ...s.items,
                    {
                      local_id: localId,
                      user_id: userId,
                      mode,
                      input_data: body,
                      response_text: responseText,
                      created_at: new Date().toISOString(),
                      server_id: historyId || undefined,
                    },
                  ],
                };
              }
              return s;
            })
          );
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again later.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
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
      case "study":
        return "Get help with study materials";
      case "project":
        return `Work on a project (${projectMode === "guided" ? "Guided" : "Fast"})`;
      default:
        return "";
    }
  };


  const renderInline = (text) => {
    const parts = [];
    let lastIndex = 0;
    const regex = /\*\*(.+?)\*\*/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const renderMessageContent = (text) => {
    const lines = text.split("\n");
    const blocks = [];
    let paragraph = [];
    let listBuffer = [];
    let listType = null;

    const normalizeLine = (value) => {
      const cleaned = value.replace(/\s+/g, " ").trim();
      const labelMatch = cleaned.match(/^(Guiding Question|Explanation|Summary|Key Point|Conclusion):\s*/i);
      if (labelMatch) {
        const label = labelMatch[1];
        return `**${label}:** ${cleaned.slice(labelMatch[0].length)}`;
      }
      return cleaned;
    };

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push({ type: "p", lines: [...paragraph] });
        paragraph = [];
      }
    };

    const flushList = () => {
      if (listBuffer.length) {
        blocks.push({ type: listType, items: [...listBuffer] });
        listBuffer = [];
        listType = null;
      }
    };

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        flushList();
        return;
      }

      if (line.length <= 3 && !/[a-z0-9]/i.test(line)) {
        flushParagraph();
        flushList();
        return;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        blocks.push({
          type: "h",
          level: headingMatch[1].length,
          text: normalizeLine(headingMatch[2]),
        });
        return;
      }

      const orderedMatch = line.match(/^\d+\.\s+/);
      const bulletMatch = line.match(/^[-*]\s+/);

      if (orderedMatch) {
        flushParagraph();
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        listBuffer.push(normalizeLine(line.replace(/^\d+\.\s+/, "")));
        return;
      }

      if (bulletMatch) {
        flushParagraph();
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        listBuffer.push(normalizeLine(line.replace(/^[-*]\s+/, "")));
        return;
      }

      flushList();
      paragraph.push(normalizeLine(line));
    });

    flushParagraph();
    flushList();

    return (
      <div className="chat-format">
        {blocks.map((block, idx) => {
          if (block.type === "h") {
            const Tag = `h${Math.min(Math.max(block.level, 2), 4)}`;
            return <Tag key={`h-${idx}`}>{renderInline(block.text)}</Tag>;
          }
          if (block.type === "p") {
            return (
              <p key={`p-${idx}`}>
                {renderInline(block.lines.join(" "))}
              </p>
            );
          }
          if (block.type === "ol") {
            return (
              <ol key={`ol-${idx}`}>
                {block.items.map((item, i) => (
                  <li key={`oli-${i}`}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          }
          return (
            <ul key={`ul-${idx}`}>
              {block.items.map((item, i) => (
                <li key={`uli-${i}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        })}
      </div>
    );
  };

  const isNewChat = messages.length === 1 && messages[0].id === "welcome";
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
            <span>Notex AI</span>
          </div>
          <button className="sidebar-new-chat" onClick={startNewChat}>
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>

        <div className="sidebar-content">
          {chatSessions.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#8e8e8e", fontSize: "0.875rem" }}>
              No chat history yet
            </div>
          ) : (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Recent Chats</div>
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`sidebar-chat-item ${session.id === currentSessionId ? "active" : ""}`}
                  onClick={() => openSession(session)}
                >
                  {renameSessionId === session.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={(e) => saveRename(session.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(session.id, e);
                        if (e.key === "Escape") cancelRename(e);
                      }}
                      autoFocus
                      style={{
                        flex: 1,
                        background: "#3a3a3a",
                        border: "1px solid #4a4a4a",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        color: "#fff",
                        fontSize: "0.875rem",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="sidebar-chat-item-title">{session.title}</span>
                      {deleteConfirmId === session.id ? (
                        <div style={{ display: "flex", gap: "6px" }}>
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
        <div className="sidebar-footer" style={{ borderTop: "1px solid #3a3a3a" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => onNavigate && onNavigate("home")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2a2a2c"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <HomeIcon />
              <span>Home</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("notes")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2a2a2c"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <NotesIcon />
              <span>Notes</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("shares")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2a2a2c"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <UsersIcon />
              <span>Shares</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("account")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2a2a2c"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <UserIcon />
              <span>Account</span>
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                background: "transparent",
                border: "none",
                borderRadius: "8px",
                color: "#e5e5e5",
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#2a2a2c"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
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
        className="ai-main"
        style={{
          marginLeft: sidebarOpen && !isMobile ? "260px" : "0",
        }}
      >
        {/* Header with toggle button */}
        <header className="ai-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              background: "var(--muted-button-bg)",
              border: "1px solid var(--muted-button-border)",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--muted-button-bg-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "var(--muted-button-bg)";
            }}
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
            <div ref={headerMenuRef} style={{ position: "relative" }}>
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
                <div
                  className="mode-dropdown-menu"
                  style={{
                    right: 0,
                    left: "auto",
                    top: "calc(100% + 8px)",
                    minWidth: "210px",
                    zIndex: 120,
                  }}
                >
                <button
                  onClick={() => {
                    createShareLink("read", currentSessionId);
                    setHeaderMenuOpen(false);
                  }}
                  disabled={isNewChat}
                  title="Share read-only link"
                >
                  Share
                </button>
                <button
                  onClick={() => {
                    createShareLink("collab", currentSessionId);
                    setHeaderMenuOpen(false);
                  }}
                  disabled={isNewChat}
                  title="Create collaboration link"
                >
                  Collaborate
                </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {shareStatus && (
          <div style={{ padding: "6px 20px", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            {shareStatus}
          </div>
        )}
        {modelStatus && (
          <div style={{ padding: "0 20px 8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {modelStatus}
          </div>
        )}
        {currentMembers.length > 0 && (
          <div style={{ padding: "0 20px 8px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Collaborators:
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
              {currentMembers.map((member) => (
                <span key={member.user?.id || member.user?.username} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {member.user?.username}
                  {member.user?.id && currentShare?.token && (
                    <button
                      className="button-secondary"
                      onClick={() => removeMemberFromShare(currentShare.token, member.user.id)}
                      style={{ padding: "2px 6px", fontSize: "0.75rem" }}
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
          <div style={{ padding: "0 20px 12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            <div className="mode-picker">
              <div className="mode-picker-card">
                <h3>Choose a mode to begin</h3>
                <p>{getModeDescription()}</p>
                <div className="mode-picker-actions">
                  <button
                    className={`mode-picker-btn ${mode === "general" ? "active" : ""}`}
                    onClick={() => setMode("general")}
                  >
                    General
                  </button>
                  <button
                    className={`mode-picker-btn ${mode === "study" ? "active" : ""}`}
                    onClick={() => setMode("study")}
                  >
                    Study
                  </button>
                  <button
                    className={`mode-picker-btn ${mode === "project" ? "active" : ""}`}
                    onClick={() => setMode("project")}
                  >
                    Project
                  </button>
                </div>
                {mode === "project" && (
                  <div className="mode-picker-sub">
                    <button
                      className={`mode-picker-sub-btn ${projectMode === "guided" ? "active" : ""}`}
                      onClick={() => setProjectMode("guided")}
                    >
                      Guided
                    </button>
                    <button
                      className={`mode-picker-sub-btn ${projectMode === "fast" ? "active" : ""}`}
                      onClick={() => setProjectMode("fast")}
                    >
                      Fast
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role}`}>
              <div className="ai-message-inner">
                <div className="ai-message-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                  {message.role === "user" ? (
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  ) : (
                    <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                  )}
                  {message.role === "user" ? (
                    <circle cx="12" cy="7" r="4"></circle>
                  ) : (
                    <>
                      <path d="M12 8v8"></path>
                      <path d="M8 12h8"></path>
                    </>
                  )}
                </svg>
              </div>
              <div className="ai-message-body">
                <div className="ai-message-name">
                  {message.role === "user" ? "You" : "Notex AI"}
                </div>
                <div className="chat-message-text">
                  {message.role === "assistant"
                    ? renderMessageContent(message.content)
                    : message.content}
                </div>
                {message.role === "assistant" && (
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
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10a37f",
                    animation: "typing 1.4s infinite ease-in-out",
                  }}
                ></span>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10a37f",
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.2s",
                  }}
                ></span>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10a37f",
                    animation: "typing 1.4s infinite ease-in-out",
                    animationDelay: "0.4s",
                  }}
                ></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className="ai-composer"
          style={{
            left: sidebarOpen && !isMobile ? "calc(24px + 260px)" : "24px",
            right: "24px",
          }}
        >
          <div className="ai-composer-inner">
            <div className="ai-inline-controls" ref={modeMenuRef}>
              <ImageToText onExtract={insertExtractedText} variant="icon" showStatus={false} className="ai-image-import" />
              <button
                className="ai-mode-button"
                onClick={() => setModeMenuOpen((prev) => !prev)}
                title="Choose mode"
                type="button"
              >
                {mode === "general" ? "General" : mode === "study" ? "Study" : `Project (${projectMode === "guided" ? "Guided" : "Fast"})`}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {modeMenuOpen && (
                <div className="mode-dropdown-menu mode-main-menu ai-mode-menu">
                  <button onClick={() => { setMode("general"); setModeMenuOpen(false); }}>
                    General
                  </button>
                  <button onClick={() => { setMode("study"); setModeMenuOpen(false); }}>
                    Study
                  </button>
                  <button
                    onClick={() => {
                      setMode("project");
                      setProjectOptionsOpen((prev) => !prev);
                    }}
                  >
                    Project
                  </button>
                  {projectOptionsOpen && (
                    <div className="mode-dropdown-sub">
                      <button
                        className={projectMode === "guided" ? "active" : ""}
                        onClick={() => {
                          setMode("project");
                          setProjectMode("guided");
                          setModeMenuOpen(false);
                          setProjectOptionsOpen(false);
                        }}
                      >
                        Guided
                      </button>
                      <button
                        className={projectMode === "fast" ? "active" : ""}
                        onClick={() => {
                          setMode("project");
                          setProjectMode("fast");
                          setModeMenuOpen(false);
                          setProjectOptionsOpen(false);
                        }}
                      >
                        Fast
                      </button>
                      <button
                        onClick={() => {
                          setMode("general");
                          setModeMenuOpen(false);
                          setProjectOptionsOpen(false);
                        }}
                      >
                        General
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <textarea
              ref={inputRef}
              className="ai-composer-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Notex AI..."
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`ai-send-button ${input.trim() && !loading ? "active" : "disabled"}`}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </main>

      {/* CSS Animation */}
      <style>{`
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}



