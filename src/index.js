const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const app = express();
const server = http.createServer(app);
const { generateMessages, generateLocation } = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUserInRoom,
} = require("./utils/users");
const publicDirectoryPath = path.join(__dirname, "../public");
const port = process.env.Port || 8000;

app.use(express.static(publicDirectoryPath));

// let count =0;

server.listen(port, () => {
  console.log(`app running on port ${port}`);
  const io = socketio(server);
  io.on("connection", (socket) => {
    //     socket.emit("message", generateMessages("welcome"));
    //     socket.broadcast.emit("message", generateMessages("user has joined !"));

    socket.on("sendMessage", (msg, callback) => {
      const user = getUser(socket.id);
      const filter = new Filter();
      if (filter.isProfane(msg)) {
        return callback("profane is not allowed !");
      }

      io.to(user.room).emit("message", generateMessages(user.username, msg));
      callback("delivered");
    });
    socket.on("disconnect", () => {
      const user = removeUser(socket.id);
      if (user) {
        io.to(user.room).emit(
          "message",
          generateMessages(` ${user.username} has left !`)
        );
        io.to(user.room).emit("roomdata", {
          room: user.room,
          users: getUserInRoom(user.room),
        });
      }
    });
    socket.on("shareLocation", (coords, callback) => {
      const user = getUser(socket.id);

      socket.broadcast.emit(
        "locationMessage",
        generateLocation(
          user.username,
          `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
        )
      );
      callback("location shared !");
    });

    socket.on("join", (options, callback) => {
      const { error, user } = addUser({
        id: socket.id,
        ...options,
      });
      if (error) {
        return callback(error);
      }
      // socket.emit    io.emit socket.broadcasr.emit
      // io.to.emit      socket.broadcast.to.emit
      socket.join(user.room);

      socket.emit("message", generateMessages("welcome to alshrkawy chat :)"));

      socket.broadcast
        .to(user.room)
        .emit("message", generateMessages(`${user?.username} has joined`));
      io.to(user.room).emit("roomdata", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
      callback("");
    });

    // socket.emit ("updatedCount",  count)
    // socket.on("increment" , ()=>{
    //        count ++
    //        io.emit("updatedCount",count)

    // })
  });
});
