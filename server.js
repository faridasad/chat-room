const express = require("express");
const session = require("express-session");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { config } = require("dotenv");
config();

const requireLogin = require('./middlewares/requireLogin.js');

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
  })
);

const rooms = {};
const users = {};

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/index");
  }
  res.render("login", { admin: process.env.ADMIN, pass: process.env.PASS });
});

app.post("/index", (req, res, next) => {
  if (!req.body.password) {
    req.session.user = {
      username: req.body.username,
      isAdmin: false,
    }

    return res.redirect("/index");
  }

  if (
    req.body.username === process.env.ADMIN &&
    req.body.password === process.env.PASS
  ) {
    req.session.user = {
      username: req.body.username,
      isAdmin: true,
    }
    return res.redirect("/index");
  }

  return res.redirect("/");
});

app.get("/index", requireLogin, (req, res) => {
  res.render("index", { rooms: rooms, user: req.session.user });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send("An error occurred");
    } else {
      res.redirect("/");
    }
  });
});

app.post("/room", (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect("/");
  }
  rooms[req.body.room] = { users: {} };
  res.redirect(req.body.room);
  io.emit("room-created", req.body.room);
});

app.get("/:room", (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect("/");
  }
  res.render("room", { roomName: req.params.room, username: req.session.user.username });
});

server.listen(3000);

// Socket

io.on("connection", (socket) => {
  socket.on("new-user", (room, name) => {
    console.log(name)
    socket.join(room);
    rooms[room].users[socket.id] = name;
    socket.to(room).broadcast.emit("user-connected", name);
  });
  socket.on("send-chat-message", (room, message) => {
    socket.to(room).broadcast.emit("chat-message", {
      message: message,
      name: rooms[room].users[socket.id],
    });
  });
  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit("user-disconnected", rooms[room].users[socket.id]);
      delete rooms[room].users[socket.id];
    });
  });
});

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name);
    return names;
  }, []);
}
