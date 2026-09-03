import { getApiBaseUrl } from "./config";
import { useAuthStore } from "../store/authStore";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new ApiError(0, "Server manzili sozlanmagan.");

  const execute = async () => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  };

  let response = await execute();
  if (
    authenticated &&
    response.status === 401 &&
    useAuthStore.getState().refreshToken
  ) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) response = await execute();
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body.customerMessage || body.message || "So‘rovni bajarib bo‘lmadi.";
    throw new ApiError(
      response.status,
      Array.isArray(message) ? message[0] : message,
    );
  }
  return body as T;
}

type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

function abortError() {
  const error = new Error("So‘rov bekor qilindi.");
  error.name = "AbortError";
  return error;
}

function executeChatStream(
  prompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  conversationId: string,
  onDelta: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return Promise.reject(new ApiError(0, "Server manzili sozlanmagan."));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let cursor = 0;
    let buffer = "";
    let content = "";
    let streamError: ApiError | null = null;
    let didComplete = false;

    const consume = () => {
      const next = xhr.responseText.slice(cursor);
      cursor = xhr.responseText.length;
      buffer += next.replace(/\r\n/g, "\n");

      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        try {
          const event = JSON.parse(data) as StreamEvent;
          if (event.type === "delta" && event.content) {
            content += event.content;
            onDelta(event.content);
          } else if (event.type === "done") {
            didComplete = true;
          } else if (event.type === "error") {
            streamError = new ApiError(xhr.status || 503, event.message);
          }
        } catch {
          streamError = new ApiError(502, "Server javobini o‘qib bo‘lmadi.");
        }
      }
    };

    const handleAbort = () => xhr.abort();
    signal?.addEventListener("abort", handleAbort, { once: true });

    xhr.open("POST", `${baseUrl}/api/v1/consumer/chat/stream`, true);
    xhr.setRequestHeader("Accept", "text/event-stream");
    xhr.setRequestHeader("Content-Type", "application/json");
    const token = useAuthStore.getState().accessToken;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onprogress = consume;
    xhr.onload = () => {
      consume();
      signal?.removeEventListener("abort", handleAbort);
      if (streamError) return reject(streamError);
      if (xhr.status < 200 || xhr.status >= 300) {
        return reject(
          new ApiError(xhr.status, "Zayuno serveriga ulanib bo‘lmadi."),
        );
      }
      if (!content.trim()) {
        return reject(new ApiError(502, "Zayuno javob qaytarmadi."));
      }
      if (!didComplete) {
        return reject(
          new ApiError(
            502,
            "Javob oqimi to‘liq tugamadi. Qayta urinib ko‘ring.",
          ),
        );
      }
      resolve(content.trim());
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", handleAbort);
      reject(new ApiError(0, "Internet yoki server bilan aloqa uzildi."));
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", handleAbort);
      reject(abortError());
    };
    xhr.send(JSON.stringify({ prompt, messages, conversationId }));
  });
}

export async function streamChat(
  prompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  conversationId: string,
  onDelta: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  try {
    return await executeChatStream(
      prompt,
      messages,
      conversationId,
      onDelta,
      signal,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      useAuthStore.getState().refreshToken
    ) {
      const refreshed = await useAuthStore.getState().refreshSession();
      if (refreshed) {
        return executeChatStream(
          prompt,
          messages,
          conversationId,
          onDelta,
          signal,
        );
      }
    }
    throw error;
  }
}
