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

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    setToken(token);
    loadServers();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadServers = async () => {
    const res = await api.get<ServerDto[]>("/servers");
    setServers(res.data);
  };

  const doLogin = async () => {
    const res = await api.post("/auth/login", { email, password });
    const t = res.data.access_token;
    localStorage.setItem(LS_TOKEN, t);
    setJwt(t);
  };

  const doRegister = async () => {
    const res = await api.post("/auth/register", {
      email,
      username,
      password,
    });
    const t = res.data.access_token;
    localStorage.setItem(LS_TOKEN, t);
    setJwt(t);
  };

  const logout = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem(LS_TOKEN);
    setJwt("");
    setMessages([]);
    setOnlineUsers([]);
    setSelectedServer(null);
    setSelectedChannel(null);
  };

  const selectServer = async (server: ServerDto) => {
    setSelectedServer(server);
    const res = await api.get<ChannelDto[]>(`/channels/${server.id}`);
    setChannels(res.data);
  };

  const selectChannel = async (channel: ChannelDto) => {
    setSelectedChannel(channel);

    const history = await api.get<MessageDto[]>(`/messages/${channel.id}`);
    setMessages(history.data);

    socketRef.current?.disconnect();
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on("message:new", (msg: MessageDto) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("presence:update", (users: { username: string }[]) => {
      setOnlineUsers(users.map((u) => u.username));
    });

    socket.emit("channel:join", { channelId: channel.id });
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedChannel) return;

    socketRef.current?.emit("message:send", {
      channelId: selectedChannel.id,
      content: input.trim(),
    });

    setInput("");
  };

  const createInvite = async () => {
    if (!selectedServer) return;
    const res = await api.post(`/invites/${selectedServer.id}`);
    setInviteCode(res.data.code);
    setShowInviteModal(true);
  };

  const joinServer = async () => {
    if (!joinCode.trim()) return;
    await api.post(`/invites/join/${joinCode.trim()}`);
    setShowJoinModal(false);
    setJoinCode("");
    await loadServers();
  };

  // ================= AUTH =================

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

          <button
            style={primaryBtn}
            onClick={mode === "login" ? doLogin : doRegister}
          >
            {mode === "login" ? "Login" : "Register"}
          </button>

          <div
            style={{ cursor: "pointer", opacity: 0.8 }}
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
          >
            {mode === "login"
              ? "No account? Register"
              : "Have account? Login"}
          </div>
        </div>
      </div>
    );
  }

  // ================= MAIN =================

  return (
    <div style={layout}>
      {/* SERVERS */}
      <div style={serverBar}>
        {servers.map((s) => (
          <div
            key={s.id}
            style={{
              ...serverIcon,
              background:
                selectedServer?.id === s.id ? "#5865f2" : "#2b2d31",
            }}
            onClick={() => selectServer(s)}
          >
            {s.name[0]}
          </div>
        ))}

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
            <button style={primaryBtnSmall} onClick={createInvite}>
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
                background:
                  selectedChannel?.id === c.id
                    ? "#404249"
                    : "transparent",
              }}
              onClick={() => selectChannel(c)}
            >
              # {c.name}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div style={chatArea}>
        <div style={chatHeader}>
          {selectedChannel?.name || "Select channel"}
        </div>

        <div style={messagesArea}>
          {messages.map((m) => (
            <div key={m.id} style={messageRow}>
              <div style={avatar}>
                {(m.user?.username || m.userId)[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {m.user?.username || "Unknown"}
                </div>
                <div>{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {selectedChannel && (
          <div style={inputBar}>
            <input
              style={chatInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button style={primaryBtn} onClick={sendMessage}>
              Send
            </button>
          </div>
        )}
      </div>

      {/* ONLINE */}
      <div style={onlineBar}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>
          Online
        </div>
        {onlineUsers.map((u) => (
          <div key={u} style={onlineItem}>
            <div style={onlineDot}></div>
            {u}
          </div>
        ))}
      </div>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <Modal onClose={() => setShowInviteModal(false)}>
          <h3>Invite Code</h3>
          <div style={{ margin: "10px 0", fontSize: 18 }}>
            {inviteCode}
          </div>
          <button
            style={primaryBtn}
            onClick={() => {
              navigator.clipboard.writeText(inviteCode || "");
            }}
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
          />
          <button style={primaryBtn} onClick={joinServer}>
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
};

const joinBtn = {
  padding: 6,
  background: "#3ba55c",
  borderRadius: 6,
  textAlign: "center" as const,
  marginBottom: 6,
  cursor: "pointer",
};

const logoutBtn = {
  padding: 6,
  background: "#f04747",
  borderRadius: 6,
  textAlign: "center" as const,
  cursor: "pointer",
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
  fontWeight: "bold",
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
