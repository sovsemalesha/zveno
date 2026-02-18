import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api, setToken } from "./api";
import { connectSocket } from "./socket";

type ServerDto = { id: string; name: string };
type ChannelDto = { id: string; name: string };
type MessageDto = {
  id: string;
  content: string;
  userId: string;
  user?: { username?: string };
};

const LS_TOKEN = "zveno:token";
const LS_SERVER = "zveno:selectedServer";
const LS_CHANNEL = "zveno:selectedChannel";

function App() {
  const [token, setJwt] = useState(() => localStorage.getItem(LS_TOKEN) || "");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const [servers, setServers] = useState<ServerDto[]>([]);
  const [channels, setChannels] = useState<ChannelDto[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerDto | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDto | null>(null);

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");

  const socketRef = useRef<Socket | null>(null);

  // контейнер сообщений (скролл)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // чтобы не восстанавливать состояние несколько раз
  const restoredOnceRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    setToken(token);
    void loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ---------- SCROLL HELPERS ----------
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const isUserAtBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    const threshold = 60;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const scrollToBottomAfterPaint = () => {
    // 2 тика: сначала React отрисует, потом браузер посчитает scrollHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  };

  // ---------- DATA ----------
  const loadServers = async () => {
    const res = await api.get<ServerDto[]>("/servers");
    setServers(res.data);

    // восстановление сервера/канала один раз после загрузки серверов
    if (restoredOnceRef.current) return;
    restoredOnceRef.current = true;

    const savedServerId = localStorage.getItem(LS_SERVER);
    if (!savedServerId) return;

    const srv = res.data.find((s) => s.id === savedServerId) || null;
    if (!srv) return;

    await selectServer(srv, { restoreChannel: true });
  };

  // ---------- AUTH ----------
  const doLogin = async () => {
    const res = await api.post("/auth/login", { email, password });
    const t = res.data.access_token as string;
    localStorage.setItem(LS_TOKEN, t);
    setJwt(t);
  };

  const doRegister = async () => {
    const res = await api.post("/auth/register", { email, username, password });
    const t = res.data.access_token as string;
    localStorage.setItem(LS_TOKEN, t);
    setJwt(t);
  };

  const logout = () => {
    try {
      socketRef.current?.disconnect();
    } catch {
      // ignore
    }
    socketRef.current = null;

    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_SERVER);
    localStorage.removeItem(LS_CHANNEL);

    restoredOnceRef.current = false;

    setJwt("");
    setMessages([]);
    setOnlineUsers([]);
    setServers([]);
    setChannels([]);
    setSelectedServer(null);
    setSelectedChannel(null);
    setInput("");
  };

  // ---------- SERVERS ----------
  const createServer = async () => {
    const name = newServerName.trim();
    if (!name) return;

    await api.post("/servers", { name });

    setShowCreateServerModal(false);
    setNewServerName("");
    restoredOnceRef.current = false; // можно восстановить заново при перезагрузке списка
    await loadServers();
  };

  const selectServer = async (
    server: ServerDto,
    opts?: { restoreChannel?: boolean }
  ) => {
    setSelectedServer(server);
    localStorage.setItem(LS_SERVER, server.id);

    // сбрасываем текущий чат/канал
    setSelectedChannel(null);
    setMessages([]);
    setChannels([]);
    setOnlineUsers([]);

    // грузим каналы
    const res = await api.get<ChannelDto[]>(`/channels/${server.id}`);
    setChannels(res.data);

    if (opts?.restoreChannel) {
      const savedChannelId = localStorage.getItem(LS_CHANNEL);
      if (savedChannelId) {
        const ch = res.data.find((c) => c.id === savedChannelId);
        if (ch) {
          await selectChannel(ch, { initialScrollToBottom: true });
        }
      }
    }
  };

  // ---------- CHANNEL ----------
  const selectChannel = async (
    channel: ChannelDto,
    opts?: { initialScrollToBottom?: boolean }
  ) => {
    setSelectedChannel(channel);
    localStorage.setItem(LS_CHANNEL, channel.id);

    // история
    const history = await api.get<MessageDto[]>(`/messages/${channel.id}`);
    setMessages(history.data);

    // сокет
    socketRef.current?.disconnect();
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on("message:new", (msg: MessageDto) => {
      const shouldScroll = isUserAtBottom();

      setMessages((prev) => [...prev, msg]);

      if (shouldScroll) {
        scrollToBottomAfterPaint();
      }
    });

    socket.on("presence:update", (users: { username: string }[]) => {
      setOnlineUsers(users.map((u) => u.username));
    });

    socket.emit("channel:join", { channelId: channel.id });

    // ВАЖНО: после загрузки истории — сразу в конец
    if (opts?.initialScrollToBottom ?? true) {
      scrollToBottomAfterPaint();
    }
  };

  // ---------- MESSAGE ----------
  const sendMessage = () => {
    const content = input.trim();
    if (!content || !selectedChannel) return;

    socketRef.current?.emit("message:send", {
      channelId: selectedChannel.id,
      content,
    });

    setInput("");
  };

  // ---------- INVITES ----------
  const createInvite = async () => {
    if (!selectedServer) return;
    const res = await api.post(`/invites/${selectedServer.id}`);
    setInviteCode(res.data.code);
    setShowInviteModal(true);
  };

  const joinServer = async () => {
    const code = joinCode.trim();
    if (!code) return;

    await api.post(`/invites/join/${code}`);
    setShowJoinModal(false);
    setJoinCode("");

    restoredOnceRef.current = false;
    await loadServers();
  };

  // ================= AUTH UI =================
  if (!token) {
    return (
      <div style={authWrapper}>
        <div style={authBox}>
          <h2>Zveno</h2>

          <input
            style={inputStyle}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode === "register" && (
            <input
              style={inputStyle}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            type="password"
            style={inputStyle}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={primaryBtn} onClick={mode === "login" ? doLogin : doRegister}>
            {mode === "login" ? "Login" : "Register"}
          </button>

          <div
            style={{ cursor: "pointer", opacity: 0.8 }}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "No account? Register" : "Have account? Login"}
          </div>
        </div>
      </div>
    );
  }

  // ================= MAIN UI =================
  return (
    <div style={layout}>
      {/* SERVERS */}
      <div style={serverBar}>
        {servers.map((s) => (
          <div
            key={s.id}
            style={{
              ...serverIcon,
              background: selectedServer?.id === s.id ? "#5865f2" : "#2b2d31",
            }}
            onClick={() => void selectServer(s)}
            title={s.name}
          >
            {s.name?.[0] ?? "?"}
          </div>
        ))}

        {/* + CREATE SERVER */}
        <div
          style={{ ...serverIcon, background: "#3ba55c" }}
          onClick={() => setShowCreateServerModal(true)}
          title="Create server"
        >
          +
        </div>

        <div style={{ marginTop: "auto" }}>
          <div style={joinBtn} onClick={() => setShowJoinModal(true)}>
            Join
          </div>
          <div style={logoutBtn} onClick={logout}>
            Logout
          </div>
        </div>
      </div>

      {/* CHANNELS */}
      <div style={channelBar}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>{selectedServer?.name || "Channels"}</div>
          {selectedServer && (
            <button style={primaryBtnSmall} onClick={() => void createInvite()}>
              Invite
            </button>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          {channels.map((c) => (
            <div
              key={c.id}
              style={{
                ...channelItem,
                background: selectedChannel?.id === c.id ? "#404249" : "transparent",
              }}
              onClick={() => void selectChannel(c, { initialScrollToBottom: true })}
            >
              # {c.name}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div style={chatArea}>
        <div style={chatHeader}>{selectedChannel?.name || "Select channel"}</div>

        <div style={messagesArea} ref={messagesContainerRef}>
          {messages.map((m) => (
            <div key={m.id} style={messageRow}>
              <div style={avatar}>{(m.user?.username || m.userId || "?")[0]}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{m.user?.username || "Unknown"}</div>
                <div>{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        {selectedChannel && (
          <div style={inputBar}>
            <input
              style={chatInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message..."
            />
            <button style={primaryBtn} onClick={sendMessage}>
              Send
            </button>
          </div>
        )}
      </div>

      {/* ONLINE */}
      <div style={onlineBar}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Online</div>
        {onlineUsers.map((u) => (
          <div key={u} style={onlineItem}>
            <div style={onlineDot} />
            {u}
          </div>
        ))}
      </div>

      {/* CREATE SERVER MODAL */}
      {showCreateServerModal && (
        <Modal onClose={() => setShowCreateServerModal(false)}>
          <h3>Create Server</h3>
          <input
            style={inputStyle}
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            placeholder="Server name"
            onKeyDown={(e) => e.key === "Enter" && createServer()}
          />
          <button style={primaryBtn} onClick={() => void createServer()}>
            Create
          </button>
        </Modal>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)}>
          <h3>Invite Code</h3>
          <div style={{ margin: "10px 0", fontSize: 18 }}>{inviteCode}</div>
          <button
            style={primaryBtn}
            onClick={() => navigator.clipboard.writeText(inviteCode || "")}
          >
            Copy
          </button>
        </Modal>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <Modal onClose={() => setShowJoinModal(false)}>
          <h3>Join Server</h3>
          <input
            style={inputStyle}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter invite code"
            onKeyDown={(e) => e.key === "Enter" && joinServer()}
          />
          <button style={primaryBtn} onClick={() => void joinServer()}>
            Join
          </button>
        </Modal>
      )}
    </div>
  );
}

export default App;

/* ================= COMPONENTS ================= */

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const layout = {
  display: "flex",
  height: "100vh",
  background: "#313338",
  color: "white",
  fontFamily: "sans-serif",
};

const serverBar = {
  width: 80,
  background: "#1e1f22",
  padding: 10,
  display: "flex",
  flexDirection: "column" as const,
};

const serverIcon = {
  height: 50,
  width: 50,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
  cursor: "pointer",
  userSelect: "none" as const,
};

const joinBtn = {
  padding: 6,
  background: "#3ba55c",
  borderRadius: 6,
  textAlign: "center" as const,
  marginBottom: 6,
  cursor: "pointer",
  userSelect: "none" as const,
};

const logoutBtn = {
  padding: 6,
  background: "#f04747",
  borderRadius: 6,
  textAlign: "center" as const,
  cursor: "pointer",
  userSelect: "none" as const,
};

const channelBar = {
  width: 240,
  background: "#2b2d31",
  padding: 15,
};

const channelItem = {
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  marginBottom: 4,
  userSelect: "none" as const,
};

const chatArea = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
};

const chatHeader = {
  padding: 15,
  borderBottom: "1px solid #232428",
};

const messagesArea = {
  flex: 1,
  overflowY: "auto" as const,
  padding: 15,
};

const messageRow = {
  display: "flex",
  gap: 10,
  marginBottom: 12,
};

const avatar = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "#5865f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold" as const,
  userSelect: "none" as const,
};

const inputBar = {
  padding: 15,
  borderTop: "1px solid #232428",
  display: "flex",
  gap: 10,
};

const chatInput = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#1e1f22",
  color: "white",
  outline: "none",
};

const onlineBar = {
  width: 200,
  background: "#2b2d31",
  padding: 15,
};

const onlineItem = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

const onlineDot = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#3ba55c",
};

const authWrapper = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#313338",
};

const authBox = {
  width: 380,
  background: "#2b2d31",
  padding: 30,
  borderRadius: 12,
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#1e1f22",
  color: "white",
  outline: "none",
};

const primaryBtn = {
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#5865f2",
  color: "white",
  cursor: "pointer",
};

const primaryBtnSmall = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "none",
  background: "#5865f2",
  color: "white",
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalBox = {
  background: "#2b2d31",
  padding: 20,
  borderRadius: 10,
  width: 300,
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
};
