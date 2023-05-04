const socket = io("https://millimeclis.onrender.com/");
const messageContainer = document.getElementById("message-container");
const roomContainer = document.getElementById("rooms-container");
const userContainer = document.getElementById("users-container");
const usersHeader = document.querySelector(".users-header");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");


if (messageForm != null) {

  appendMessage({ message: "You joined" });
  socket.emit("new-user", roomName, username);

  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if(messageInput.value.trim() == "") return;

    sendButton.disabled = true;
    const message = messageInput.value;
    const lastMessage = messageContainer.lastChild;
    lastMessage.classList.contains("author")
      ? appendMessage({ message, isAuthor: true })
      : appendMessage({ message, isAuthor: true, who: "You" });
    socket.emit("send-chat-message", roomName, message);
    messageInput.value = "";
    setTimeout(() => {
      sendButton.disabled = false;
    }, 1000);

    
  });

}

socket.on("room-created", (room) => {
  const roomElement = document.createElement("div");
  roomElement.classList.add("room");
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  const roomButton = document.createElement("button");
  roomButton.textContent = "Join";
  roomLink.append(roomButton);
  roomElement.append(roomLink);
  roomContainer.append(roomElement);
});

socket.on("user-joined", (user) => {
  let usersCount = parseInt(usersHeader.textContent.split(" ")[2]);
  usersCount++;

  usersHeader.textContent = `Online 👁 ${usersCount}`;

  const user_con = document.createElement("div");
  user_con.classList.add("user");

  const username = document.createElement("span");
  username.textContent = user.name;
  username.classList.add("username");

  user_con.append(username);
  if (user.isAdmin) {
    const boss = document.createElement("span");
    boss.classList.add("boss");

    boss.textContent = "🐱‍👤";
    user_con.append(boss);
  }
  if(admin == "true") {
    const kick = document.createElement("a");
    kick.classList.add("kick");
    kick.href = `/kick/${user.id}`
    kick.textContent = "❌";
    user_con.append(kick);
  }
  user.isAdmin ? userContainer.prepend(user_con) : userContainer.append(user_con);
});

socket.on("chat-message", (data) => {
  const lastMessage = messageContainer.lastChild;
  const currentAuthor = lastMessage.getAttribute("data-author");
  appendMessage({
    message: data.message,
    isAuthor: false,
    who: data.name,
    lastAuthor: currentAuthor,
  });
});

socket.on("user-connected", (name) => {
  appendMessage({ message: `${name} connected` });
});

socket.on("user-disconnected", (name) => {
  appendMessage({ message: `${name} disconnected` });
});

socket.on("kicked", (name) => {
  if(name == username) {
    alert("You have been kicked!");
    window.location.href = "/";
  }
})

function appendMessage({ message, isAuthor, who, lastAuthor }) {
  const messageElement = document.createElement("div");
  const messageText = document.createElement("span");
  messageText.classList.add("message");

  if (who && who !== lastAuthor) {
    const authorName = document.createElement("span");
    authorName.classList.add("author-name");
    authorName.textContent = who;
    messageElement.append(authorName);
  }

  isAuthor && messageElement.classList.add("author");

  messageElement.setAttribute("data-author", who);

  messageText.textContent = message;
  messageElement.append(messageText);
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}
