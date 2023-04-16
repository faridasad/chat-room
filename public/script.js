const socket = io(process.env.SERVER_URL);
const messageContainer = document.getElementById("message-container");
const roomContainer = document.getElementById("room-container");
const messageForm = document.getElementById("send-container");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button")

if (messageForm != null) {
  appendMessage({ message: "You joined" });
  socket.emit("new-user", roomName, username);

  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
  roomElement.innerText = room;
  const roomLink = document.createElement("a");
  roomLink.href = `/${room}`;
  roomLink.innerText = "Join";
  roomContainer.append(roomElement);
  roomContainer.append(roomLink);
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

function appendMessage({ message, isAuthor, who, lastAuthor }) {
  console.log(lastAuthor, who);
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
}

window.history.pushState(null, null, document.URL);
window.addEventListener("popstate", function () {
  window.history.pushState(null, null, document.URL);
});
