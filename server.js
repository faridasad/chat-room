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
let users = [];

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/index");
  }
  res.render("login", { admin: process.env.ADMIN, pass: process.env.PASS });
});

app.post("/index", (req, res) => {
  if (users.find((u) => u.name === req.body.username)) {
    return res.redirect("/");
  }

  try {
    req.session.user = {
      username: req.body.username,
      isAdmin:
        req.body.password === process.env.PASS &&
        req.body.username === process.env.ADMIN,
    };

    const user = {
      name: req.body.username,
      id: req.sessionID,
      isAdmin: req.session.user.isAdmin,
    }

    users.push(user);

    io.emit("user-joined", user)
    
    return res.redirect("/index");
  } catch (err) {
    return res.redirect("/");
  }
});

app.get("/index", requireLogin, (req, res) => {
  users.sort((a, b) => {
    if (a.isAdmin) {
      return -1;
    } else if (b.isAdmin) {
      return 1;
    } else {
      return 0;
    }
  });
  res.render("index", { rooms, user: req.session.user, users });
});

app.get("/logout", (req, res) => {

  users = users.filter((u) => u.name !== req.session.user.username);

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
  if (!rooms.find((r) => r.room === req.params.room) || !req.session.user) {
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

app.get("/kick/:user", (req, res) => {
  const user = users.find((u) => u.id === req.params.user);
  io.emit("kicked", user.name);

  memoryStore.get(req.params.user, (err, session) => {
    if (err) {
      console.log(err);
    }
    if (session) {
      memoryStore.destroy(req.params.user, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  });

  if (!user || !req.session.user.isAdmin || user.isAdmin) {
    return res.redirect("/index");
  }

  
  users = users.filter((u) => u.id !== req.params.user);
  
  return res.redirect("/index");
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
  socket.on("send-chat-message", (room, message) => {
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
