const socket = io();

function joinRoom() {
    let roomCode = document.getElementById("room-code").value.trim().toUpperCase();
    let username = document.getElementById("username").value.trim();

    if (!roomCode || !username) {
        alert("Enter both room code and username.");
        return;
    }

    socket.emit("join", { room: roomCode, username });

    document.getElementById("join-room").style.display = "none";
    document.getElementById("chat-room").style.display = "block";
    document.getElementById("message-input").dataset.username = username; // Store username
}

function sendMessage() {
    let messageInput = document.getElementById("message-input");
    let message = messageInput.value.trim();
    let roomCode = document.getElementById("room-code").value.trim().toUpperCase();
    let username = messageInput.dataset.username;

    if (!message) return;

    socket.emit("send_message", { room: roomCode, username, message });

    messageInput.value = "";
}

// Add Enter key functionality
document.getElementById("message-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

socket.on("message", (data) => {
    let msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    let text = document.createElement("span");
    text.classList.add("message-text");
    text.textContent = "••••••••••••";

    let revealBtn = document.createElement("button");
    revealBtn.classList.add("reveal-btn");
    revealBtn.textContent = "Reveal";
    revealBtn.onclick = () => {
        text.textContent = `${data.user}: ${data.message}`; // Show username + message
        setTimeout(() => {
            msgDiv.style.opacity = "0"; // Start fading effect
            setTimeout(() => msgDiv.remove(), 1000); // Remove after fade
        }, 2000);
    };

    msgDiv.appendChild(text);
    msgDiv.appendChild(revealBtn);
    document.getElementById("messages").appendChild(msgDiv);
});

// Handle user list updates
socket.on("user_list", (users) => {
    let activeUsersDiv = document.getElementById("active-users");
    activeUsersDiv.textContent = "Users: " + users.join(", ");
});

function leaveRoom() {
    let roomCode = document.getElementById("room-code").value.trim().toUpperCase();
    let username = document.getElementById("message-input").dataset.username;

    socket.emit("leave", { room: roomCode, username });

    document.getElementById("chat-room").style.display = "none";
    document.getElementById("join-room").style.display = "block";
}