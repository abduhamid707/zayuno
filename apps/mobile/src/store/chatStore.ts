import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { apiFetch } from "../lib/api";
import { ChatInteraction, InteractionChoice } from "../lib/interaction";

const LEGACY_STORAGE_KEY = "zayuno_chat_sessions_v1";
const storageKey = (userId: string) => `zayuno_chat_sessions_v2:${userId}`;
let writeQueue = Promise.resolve();
const remoteQueues = new Map<string, Promise<unknown>>();
let hydrationGeneration = 0;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  latencyMs?: number;
  interaction?: ChatInteraction;
  selections?: InteractionChoice[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  currentUserId: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  hydrate: (userId: string) => Promise<void>;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  addMessage: (
    message: Pick<ChatMessage, "role" | "content"> & {
      latencyMs?: number;
      interaction?: ChatInteraction;
      selections?: InteractionChoice[];
    },
  ) => string;
  setLoading: (loading: boolean) => void;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function queueLocalSave(userId: string, sessions: ChatSession[]) {
  const snapshot = JSON.stringify(sessions);
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(storageKey(userId), snapshot));
  return writeQueue;
}

function queueRemote(sessionId: string, operation: () => Promise<unknown>) {
  const previous = remoteQueues.get(sessionId) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  remoteQueues.set(sessionId, next);
  const cleanup = () => {
    if (remoteQueues.get(sessionId) === next) remoteQueues.delete(sessionId);
  };
  void next.then(cleanup, cleanup);
  return next;
}

function syncSession(session: ChatSession) {
  return queueRemote(session.id, () =>
    apiFetch(`/api/v1/consumer/chats/${encodeURIComponent(session.id)}`, {
      method: "PUT",
      body: JSON.stringify(session),
    }),
  ).catch(() => undefined);
}

function mergeSessions(local: ChatSession[], remote: ChatSession[]) {
  const merged = new Map<string, ChatSession>();
  for (const session of [...remote, ...local]) {
    const current = merged.get(session.id);
    if (!current || session.updatedAt > current.updatedAt)
      merged.set(session.id, session);
  }
  return [...merged.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  currentUserId: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async (userId) => {
    const current = get();
    if (current.currentUserId === userId && current.isHydrated) return;
    const generation = ++hydrationGeneration;
    set({
      sessions: [],
      activeSessionId: null,
      currentUserId: userId,
      isHydrated: false,
      isLoading: false,
    });
    try {
      let raw = await AsyncStorage.getItem(storageKey(userId));
      if (!raw) {
        raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          await AsyncStorage.setItem(storageKey(userId), raw);
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
      const local = raw ? (JSON.parse(raw) as ChatSession[]) : [];
      if (generation !== hydrationGeneration) return;
      set({ sessions: local, activeSessionId: null, isHydrated: true });

      try {
        const remote = await apiFetch<ChatSession[]>("/api/v1/consumer/chats");
        if (generation !== hydrationGeneration) return;
        const remoteSessions = Array.isArray(remote) ? remote : [];
        const sessions = mergeSessions(local, remoteSessions);
        set({ sessions, activeSessionId: null, isHydrated: true });
        await queueLocalSave(userId, sessions);
        const remoteVersions = new Map(
          remoteSessions.map((item) => [item.id, item.updatedAt]),
        );
        await Promise.allSettled(
          local
            .filter(
              (item) =>
                !remoteVersions.has(item.id) ||
                item.updatedAt > remoteVersions.get(item.id)!,
            )
            .map(syncSession),
        );
      } catch {
        // Local history remains usable offline and syncs after the next login/start.
      }
    } catch {
      if (generation === hydrationGeneration)
        set({ sessions: [], activeSessionId: null, isHydrated: true });
    }
  },

  newChat: () => set({ activeSessionId: null, isLoading: false }),
  selectSession: (id) => set({ activeSessionId: id, isLoading: false }),

  deleteSession: async (id) => {
    const userId = get().currentUserId;
    let nextSessions: ChatSession[] = [];
    set((state) => {
      nextSessions = state.sessions.filter((session) => session.id !== id);
      return {
        sessions: nextSessions,
        activeSessionId:
          state.activeSessionId === id
            ? nextSessions[0]?.id || null
            : state.activeSessionId,
      };
    });
    if (!userId) return;
    await queueLocalSave(userId, nextSessions);
    await queueRemote(id, () =>
      apiFetch(`/api/v1/consumer/chats/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    ).catch(() => undefined);
  },

  addMessage: ({ role, content, latencyMs, interaction, selections }) => {
    const now = new Date().toISOString();
    const message: ChatMessage = {
      id: makeId(),
      role,
      content,
      createdAt: now,
      latencyMs,
      interaction,
      selections,
    };
    let resolvedSessionId = "";
    let changedSession: ChatSession | null = null;
    set((state) => {
      const active = state.sessions.find(
        (session) => session.id === state.activeSessionId,
      );
      let sessions: ChatSession[];
      let activeSessionId = state.activeSessionId;
      if (!active) {
        activeSessionId = makeId();
        changedSession = {
          id: activeSessionId,
          title:
            role === "user"
              ? content.trim().slice(0, 54) || "Yangi suhbat"
              : "Yangi suhbat",
          messages: [message],
          createdAt: now,
          updatedAt: now,
        };
        sessions = [changedSession, ...state.sessions];
      } else {
        changedSession = {
          ...active,
          title:
            active.messages.length === 0 && role === "user"
              ? content.trim().slice(0, 54) || "Yangi suhbat"
              : active.title,
          messages: [...active.messages, message],
          updatedAt: now,
        };
        sessions = [
          changedSession,
          ...state.sessions.filter((session) => session.id !== active.id),
        ];
      }
      resolvedSessionId = activeSessionId || "";
      return { sessions, activeSessionId };
    });

    const { currentUserId, sessions } = get();
    if (currentUserId && changedSession) {
      void queueLocalSave(currentUserId, sessions);
      void syncSession(changedSession);
    }
    return resolvedSessionId;
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
