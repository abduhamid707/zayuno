import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "zayuno_chat_sessions_v1";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
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
  isLoading: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  addMessage: (message: Pick<ChatMessage, "role" | "content">) => void;
  setLoading: (loading: boolean) => void;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function saveSessions(sessions: ChatSession[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)).catch(
    () => undefined,
  );
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const sessions = raw ? (JSON.parse(raw) as ChatSession[]) : [];
      set({
        sessions,
        activeSessionId: sessions[0]?.id || null,
        isHydrated: true,
      });
    } catch {
      set({ sessions: [], activeSessionId: null, isHydrated: true });
    }
  },

  newChat: () => set({ activeSessionId: null, isLoading: false }),

  selectSession: (id) => set({ activeSessionId: id, isLoading: false }),

  deleteSession: async (id) => {
    set((state) => {
      const sessions = state.sessions.filter((session) => session.id !== id);
      saveSessions(sessions);
      return {
        sessions,
        activeSessionId:
          state.activeSessionId === id
            ? sessions[0]?.id || null
            : state.activeSessionId,
      };
    });
  },

  addMessage: ({ role, content }) => {
    const now = new Date().toISOString();
    const message: ChatMessage = {
      id: makeId(),
      role,
      content,
      createdAt: now,
    };
    set((state) => {
      const active = state.sessions.find(
        (session) => session.id === state.activeSessionId,
      );
      let sessions: ChatSession[];
      let activeSessionId = state.activeSessionId;

      if (!active) {
        activeSessionId = makeId();
        const title =
          role === "user" ? content.trim().slice(0, 54) : "Yangi suhbat";
        sessions = [
          {
            id: activeSessionId,
            title: title || "Yangi suhbat",
            messages: [message],
            createdAt: now,
            updatedAt: now,
          },
          ...state.sessions,
        ];
      } else {
        sessions = state.sessions
          .map((session) =>
            session.id === active.id
              ? {
                  ...session,
                  title:
                    session.messages.length === 0 && role === "user"
                      ? content.trim().slice(0, 54) || "Yangi suhbat"
                      : session.title,
                  messages: [...session.messages, message],
                  updatedAt: now,
                }
              : session,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }

      saveSessions(sessions);
      return { sessions, activeSessionId };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
