const express = require("express");
const session = require("express-session");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { config } = require("dotenv");
config();


const requireLogin = require("./middlewares/requireLogin.js");
const memoryStore = new session.MemoryStore();

app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: memoryStore,
  })
);

let rooms = [];
const users = [];

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
    };

    return res.redirect("/index");
  }

  if (
    req.body.username === process.env.ADMIN &&
    req.body.password === process.env.PASS
  ) {
    req.session.user = {
      username: req.body.username,
      isAdmin: true,
    };
    return res.redirect("/index");
  }

  return res.redirect("/");
});

app.get("/index", requireLogin, (req, res) => {
  res.render("index", { rooms, user: req.session.user });
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
  if (rooms.find((r) => r.room === req.body.room)) {
    return res.redirect("/index");
  }

  rooms.push({
    room: req.body.room,
    users: [],
  });
  res.redirect("/index");

  io.emit("room-created", req.body.room);
});

app.get("/:room", (req, res) => {
  if (!rooms.find((r) => r.room === req.params.room)) {
    return res.redirect("/index");
  }
  rooms.forEach((r) => {
    if (r.room != req.params.room) {
      return res.redirect("/index");
    }
  });
  res.render("room", {
    roomName: req.params.room,
    user: req.session.user,
  });
});


server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});

// Socket

io.on("connection", (socket) => {
  socket.on("new-user", (roomName, name) => {
    socket.join(roomName);

    rooms.forEach((r) => {
      if (r.room === roomName) {
        r.users.push({
          name: name,
          id: socket.id,
        });
      }
    });
    socket.to(roomName).broadcast.emit("user-connected", name);
  });
  socket.on("send-chat-message", async (room, message) => {
    const sender =
      rooms.find((r) => r.room === room)?.users.find((u) => u.id === socket.id)
        ?.name ?? null;

    socket.to(room).broadcast.emit("chat-message", {
      message: message,
      name: sender,
    });
  });
  socket.on("disconnect", () => {
    getUserRooms(socket).forEach((room) => {
      socket
        .to(room)
        .broadcast.emit(
          "user-disconnected",
          rooms
            .find((r) => r.room === room)
            ?.users.find((u) => u.id === socket.id)?.name
        );
      rooms = rooms.map((r) => {
        if (r.room === room) {
          r.users = r.users.filter((u) => u.id !== socket.id);
        }
        return r;
      });
    });
  });
});

function getUserRooms(socket) {
  return rooms.reduce((names, room) => {
    if (room.users.find((u) => u.id === socket.id)?.name != null)
      names.push(room.room);
    return names;
  }, []);
}
