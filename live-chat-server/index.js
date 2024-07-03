const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const userRoutes = require("./Routes/userRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const messageRoutes = require("./Routes/messageRoutes");
const path = require("path");

const app = express();
dotenv.config();
app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Server is connected to DB`);
  } catch (err) {
    console.log("Server is not connected to database", err.message);
  }
};

connectDb();

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

//-------------------------Deployement ----------------//

const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {

  app.use(express.static(path.join(__dirname1, "/live-chat-client/build")));
  
  app.get('*',(req,res)=>{
    res.sendFile(path.resolve(__dirname1,"live-chat-client","build","index.html"));
  })
} else {
  app.get("/", (req, res) => {
    res.send("Api is running Successfully");
  });
}

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("Socket.io Connection established");

  socket.on("setup", (user) => {
    socket.join(user.data_id);
    console.log("Server: joined user:", user.data_id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined Room:", room);
  });

  socket.on("new message", (newMessageStatus) => {
    const chat = newMessageStatus.chat;
    if (!chat.users) {
      return console.log("chat.users not defined");
    }

    chat.users.forEach((user) => {
      if (user._id === newMessageStatus.sender._id) return;

      socket.to(user._id).emit("message received", newMessageStatus);
    });
  });
});
