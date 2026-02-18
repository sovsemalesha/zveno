import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api, setToken } from "./api";
import { connectSocket, getSocket } from "./socket";

type ServerDto = { id: string; name: string };
type ChannelDto = { id: string; name: string };
type MessageDto = {
  id: string;
  content: string;
  userId: string;
  createdAt?: string;
  user?: { username?: string };
};

type AuthMode = "login" | "register";

const LS_TOKEN = "zveno:token";
const LS_EMAIL = "zveno:email";
const LS_SERVER = "zveno:selectedServer";
const LS_CHANNEL = "zveno:selectedChannel";

function App() {
  // ---------------- AUTH ----------------
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(() => localStorage.getItem(LS_EMAIL) || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [token, setJwt] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ---------------- APP STATE ----------------
  const [servers, setServers] = useState<ServerDto[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerDto | null>(null);

  const [channels, setChannels] = useState<ChannelDto[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDto | null>(null);

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [input, setInput] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const joinedChannelIdRef = useRef<string | null>(null);

  const canSubmitAuth = useMemo(() => {
    if (authLoading) return false;
    if (!email.trim() || !password) return false;
    if (mode === "register" && !username.trim()) return false;
    return true;
  }, [authLoading, email, password, username, mode]);

  // ---------------- BOOTSTRAP WITH TOKEN ----------------
  useEffect(() => {
    if (!token) return;

    setToken(token);
    void loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------------- API HELPERS ----------------
  const loadServers = async () => {
    const serverRes = await api.get<ServerDto[]>("/servers");
    setServers(serverRes.data);

    // восстановим выбранный сервер (если он ещё существует)
    const savedServerId = localStorage.getItem(LS_SERVER);
    if (savedServerId) {
      const s = serverRes.data.find((x) => x.id === savedServerId) || null;
      if (s) {
        await selectServer(s, { restoreChannel: true });
      }
    }
  };

  const normalizeAuthError = (err: any): string => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message;

    if (status === 401) return "Неверный email или пароль";
    if (status === 409) return typeof message === "string" ? message : "Email уже занят";
    if (status === 400) {
      if (Array.isArray(message)) return message.join("\n");
      if (typeof message === "string") return message;
      return "Проверь данные формы";
    }

    return "Ошибка сервера. Попробуй ещё раз.";
  };

  // ---------------- AUTH ACTIONS ----------------
  const doLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const t: string = res.data.access_token;
      localStorage.setItem(LS_TOKEN, t);
      localStorage.setItem(LS_EMAIL, email.trim());
      setJwt(t);
      setToken(t);
      await loadServers();
    } catch (e) {
      setAuthError(normalizeAuthError(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const doRegister = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      // backend возвращает access_token + user
      const res = await api.post("/auth/register", {
        email: email.trim(),
        username: username.trim(),
        password,
      });

      const t: string = res.data.access_token;
      localStorage.setItem(LS_TOKEN, t);
      localStorage.setItem(LS_EMAIL, email.trim());
      setJwt(t);
      setToken(t);
      await loadServers();
    } catch (e) {
      setAuthError(normalizeAuthError(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(LS_TOKEN);
    setJwt("");
    setToken("");

    // чистим сокет и состояние
    try {
      socketRef.current?.disconnect();
    } catch {
      // ignore
    }
    socketRef.current = null;
    joinedChannelIdRef.current = null;

    setServers([]);
    setChannels([]);
    setMessages([]);
    setSelectedServer(null);
    setSelectedChannel(null);
  };

  // ---------------- SELECT SERVER ----------------
  const selectServer = async (server: ServerDto, opts?: { restoreChannel?: boolean }) => {
    setSelectedServer(server);
    localStorage.setItem(LS_SERVER, server.id);

    setSelectedChannel(null);
    setMessages([]);
    setChannels([]);

    const res = await api.get<ChannelDto[]>(`/channels/${server.id}`);
    setChannels(res.data);

    if (opts?.restoreChannel) {
      const savedChannelId = localStorage.getItem(LS_CHANNEL);
      if (savedChannelId) {
        const ch = res.data.find((x) => x.id === savedChannelId);
        if (ch) {
          await selectChannel(ch);
        }
      }
    }
  };

  // ---------------- SELECT CHANNEL ----------------
  const selectChannel = async (channel: ChannelDto) => {
    setSelectedChannel(channel);
    localStorage.setItem(LS_CHANNEL, channel.id);

    // 1) история
    const history = await api.get<MessageDto[]>(`/messages/${channel.id}`);
    setMessages(history.data);

    // 2) сокет: подключаем 1 раз, дальше только join/leave
    let socket = socketRef.current;
    if (!socket) {
      socket = connectSocket(token);
      socketRef.current = socket;

      socket.on("message:new", (msg: MessageDto) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    // leave предыдущий канал
    const prevId = joinedChannelIdRef.current;
    if (prevId && prevId !== channel.id) {
      socket.emit("channel:leave", { channelId: prevId });
    }

    socket.emit("channel:join", { channelId: channel.id });
    joinedChannelIdRef.current = channel.id;
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    if (!selectedChannel) return;

    const socket = getSocket();
    socket?.emit("message:send", {
      channelId: selectedChannel.id,
      content,
    });
    setInput("");
  };

  // ---------------- UI: AUTH ----------------
  if (!token) {
    return (
      <div style={{ padding: 40, maxWidth: 420 }}>
        <h2 style={{ marginBottom: 8 }}>Zveno</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => {
              setMode("login");
              setAuthError(null);
            }}
            disabled={authLoading}
            style={{
              padding: "8px 12px",
              background: mode === "login" ? "#5865f2" : "#2f3136",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: authLoading ? "not-allowed" : "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode("register");
              setAuthError(null);
            }}
            disabled={authLoading}
            style={{
              padding: "8px 12px",
              background: mode === "register" ? "#5865f2" : "#2f3136",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: authLoading ? "not-allowed" : "pointer",
            }}
          >
            Register
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="user@zveno.ru"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
          </label>

          {mode === "register" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="nickname"
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "register" ? "минимум 6 символов" : "password"}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmitAuth) {
                  void (mode === "login" ? doLogin() : doRegister());
                }
              }}
            />
          </label>

          {authError && (
            <div
              style={{
                whiteSpace: "pre-wrap",
                color: "#b00020",
                background: "#ffe6ea",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #f5b6c2",
              }}
            >
              {authError}
            </div>
          )}

          <button
            onClick={() => void (mode === "login" ? doLogin() : doRegister())}
            disabled={!canSubmitAuth}
            style={{
              padding: 12,
              background: canSubmitAuth ? "#5865f2" : "#9aa0f5",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: canSubmitAuth ? "pointer" : "not-allowed",
            }}
          >
            {authLoading ? "Loading..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- UI: APP ----------------
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* SERVERS */}
      <div style={{ width: 140, background: "#2f3136", color: "white", padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0 }}>Servers</h4>
          <button
            onClick={logout}
            style={{
              padding: "6px 8px",
              background: "transparent",
              color: "white",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              cursor: "pointer",
            }}
            title="Logout"
          >
            ↩
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {servers.map((s) => (
            <div
              key={s.id}
              style={{
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                background: selectedServer?.id === s.id ? "#5865f2" : "transparent",
              }}
              onClick={() => void selectServer(s)}
            >
              {s.name}
            </div>
          ))}
          {!servers.length && <div style={{ opacity: 0.7, marginTop: 10 }}>No servers</div>}
        </div>
      </div>

      {/* CHANNELS */}
      <div style={{ width: 240, background: "#202225", color: "white", padding: 10 }}>
        <h4 style={{ margin: 0 }}>Channels</h4>
        <div style={{ marginTop: 10 }}>
          {channels.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 10,
                borderRadius: 10,
                cursor: "pointer",
                background: selectedChannel?.id === c.id ? "#5865f2" : "transparent",
              }}
              onClick={() => void selectChannel(c)}
            >
              #{c.name}
            </div>
          ))}
          {!selectedServer && <div style={{ opacity: 0.7, marginTop: 10 }}>Select a server</div>}
          {selectedServer && !channels.length && (
            <div style={{ opacity: 0.7, marginTop: 10 }}>No channels</div>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0 }}>{selectedChannel?.name || "Select channel"}</h3>

        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: 12,
            overflowY: "auto",
            marginBottom: 10,
            padding: 12,
            background: "white",
          }}
        >
          {messages.map((m) => (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <b>{m.user?.username || m.userId}</b>: {m.content}
            </div>
          ))}
          {!selectedChannel && <div style={{ opacity: 0.7 }}>Выбери канал слева</div>}
        </div>

        {selectedChannel && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type message..."
              style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "12px 16px",
                background: "#5865f2",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
