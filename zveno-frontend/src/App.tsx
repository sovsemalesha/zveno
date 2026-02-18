import { useState} from "react";
import { api, setToken } from "./api";
import { connectSocket, getSocket } from "./socket";

function App() {
  const [email, setEmail] = useState("user2@zveno.ru");
  const [password, setPassword] = useState("123456");
  const [token, setJwt] = useState("");

  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);

  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  // ---------------- LOGIN ----------------

  const login = async () => {
    const res = await api.post("/auth/login", { email, password });
    const t = res.data.access_token;
    setJwt(t);
    setToken(t);

    const serverRes = await api.get("/servers");
    setServers(serverRes.data);
  };

  // ---------------- SELECT SERVER ----------------

  const selectServer = async (server: any) => {
    setSelectedServer(server);
    const res = await api.get(`/channels/${server.id}`);
    setChannels(res.data);
  };

  // ---------------- SELECT CHANNEL ----------------

  const selectChannel = async (channel: any) => {
    setSelectedChannel(channel);

    const socket = connectSocket(token);

    socket.on("connect", () => {
      socket.emit("channel:join", { channelId: channel.id });
    });

    socket.on("message:new", (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    const history = await api.get(`/messages/${channel.id}`);
    setMessages(history.data);
  };

  // ---------------- SEND MESSAGE ----------------

  const sendMessage = () => {
    const socket = getSocket();
    socket?.emit("message:send", {
      channelId: selectedChannel.id,
      content: input,
    });
    setInput("");
  };

  // ---------------- UI ----------------

  if (!token) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Zveno Login</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <br />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      
      {/* SERVERS */}
      <div style={{ width: 100, background: "#2f3136", color: "white" }}>
        <h4>Servers</h4>
        {servers.map((s) => (
          <div
            key={s.id}
            style={{
              padding: 10,
              cursor: "pointer",
              background:
                selectedServer?.id === s.id ? "#5865f2" : "transparent",
            }}
            onClick={() => selectServer(s)}
          >
            {s.name}
          </div>
        ))}
      </div>

      {/* CHANNELS */}
      <div style={{ width: 200, background: "#202225", color: "white" }}>
        <h4>Channels</h4>
        {channels.map((c) => (
          <div
            key={c.id}
            style={{
              padding: 10,
              cursor: "pointer",
              background:
                selectedChannel?.id === c.id ? "#5865f2" : "transparent",
            }}
            onClick={() => selectChannel(c)}
          >
            #{c.name}
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div style={{ flex: 1, padding: 20 }}>
        <h3>{selectedChannel?.name || "Select channel"}</h3>

        <div
          style={{
            height: 400,
            border: "1px solid gray",
            overflowY: "scroll",
            marginBottom: 10,
            padding: 10,
          }}
        >
          {messages.map((m) => (
            <div key={m.id}>
              <b>{m.user?.username || m.userId}</b>: {m.content}
            </div>
          ))}
        </div>

        {selectedChannel && (
          <>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type message..."
            />
            <button onClick={sendMessage}>Send</button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
