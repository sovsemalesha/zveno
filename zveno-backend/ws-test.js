const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjMTdmYTI3OC01ZmJlLTQyY2MtOWJkZi1iNzAwMTI1MDRmNzEiLCJlbWFpbCI6InVzZXIyQHp2ZW5vLnJ1IiwiaWF0IjoxNzcxNDA1NTEwLCJleHAiOjE3NzIwMTAzMTB9.5XfGTnA00HP4ey-plUw1roTLeOYZlVj6oKqghcaI6zo";

const CHANNEL_ID = "43f13ca3-8e5f-4bea-ac15-38b264ae493b";

const socket = io("http://localhost:3000", {
  auth: { token: TOKEN },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ connected:", socket.id);

  socket.emit("channel:join", { channelId: CHANNEL_ID }, (ack) => {
    console.log("join ack:", ack);
  });

  setTimeout(() => {
    socket.emit(
      "message:send",
      {
        channelId: CHANNEL_ID,
        content: "Hello realtime from Zveno 🚀",
      },
      (ack) => console.log("send ack:", ack)
    );
  }, 500);
});

socket.on("message:new", (msg) => {
  console.log("📨 message:new", msg);
});

socket.on("connect_error", (err) => {
  console.error("❌ connect_error", err.message);
});
