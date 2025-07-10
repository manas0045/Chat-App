document.addEventListener("DOMContentLoaded", () => {
  // UI Elements
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const messageContainer = document.getElementById("message-container");
  const userList = document.getElementById("user-list");
  const userCount = document.getElementById("user-count");
  const typingIndicators = document.getElementById("typing-indicators");
  const usernameModal = document.getElementById("username-modal");
  const usernameInput = document.getElementById("username-input");
  const joinButton = document.getElementById("join-button");
  const guestButton = document.getElementById("guest-button");
  const currentUsername = document.getElementById("current-username");
  const currentUserInitial = document.getElementById("current-user-initial");
  const connectionStatus = document.getElementById("connection-status");
  const themeToggle = document.getElementById("theme-toggle");

  // State
  let username = "";
  let users = {};
  let typingTimeouts = {};
  let isConnected = false;
  let socket;

  // Colors for user avatars
  const avatarColors = [
    "bg-red-400",
    "bg-blue-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-purple-400",
    "bg-pink-400",
    "bg-indigo-400",
    "bg-teal-400",
  ];

  // Show username modal on load
  usernameModal.style.display = "flex";

  // Event Listeners
  joinButton.addEventListener("click", joinChat);
  guestButton.addEventListener("click", joinAsGuest);
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") joinChat();
  });

  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  messageInput.addEventListener("input", () => {
    if (isConnected) {
      socket.send(
        JSON.stringify({
          type: "typing",
          user: username,
        })
      );

      // Reset typing indicator after 3 seconds
      clearTimeout(typingTimeouts[username]);
      typingTimeouts[username] = setTimeout(() => {
        socket.send(
          JSON.stringify({
            type: "stop_typing",
            user: username,
          })
        );
      }, 3000);
    }
  });

  themeToggle.addEventListener("click", toggleTheme);

  // Functions
  function joinChat() {
    const inputUsername = usernameInput.value.trim();
    if (inputUsername) {
      username = inputUsername;
      initializeConnection();
    }
  }

  function joinAsGuest() {
    username = `Guest-${Math.floor(Math.random() * 10000)}`;
    initializeConnection();
  }

  function initializeConnection() {
    // Close existing connection if any
    if (socket) {
      socket.close();
    }

    // For demo purposes, we'll use a mock WebSocket implementation
    // In a real app, you would connect to your WebSocket server
    // socket = new WebSocket('wss://your-websocket-server.com');

    // Mock WebSocket for demo
    socket = {
      readyState: 1,
      send: function (data) {
        const message = JSON.parse(data);
        setTimeout(() => {
          mockWebSocketServer(message);
        }, 150);
      },
      close: function () {
        this.onclose();
      },
      onmessage: null,
      onopen: null,
      onclose: null,
      onerror: null,
    };

    // Set up event listeners for the WebSocket
    socket.onopen = () => {
      isConnected = true;
      updateConnectionStatus();
      usernameModal.style.display = "none";
      currentUsername.textContent = username;
      currentUserInitial.textContent = username.charAt(0).toUpperCase();

      // Send join message
      socket.send(
        JSON.stringify({
          type: "join",
          user: username,
        })
      );
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    socket.onclose = () => {
      isConnected = false;
      updateConnectionStatus();
      setTimeout(() => {
        initializeConnection();
      }, 1000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      isConnected = false;
      updateConnectionStatus();
    };

    // For demo purposes, we'll trigger the open event immediately
    setTimeout(() => {
      if (socket.onopen) socket.onopen();
    }, 100);
  }

  function updateConnectionStatus() {
    const statusDot = connectionStatus.querySelector("span:first-child");
    const statusText = connectionStatus.querySelector("span:last-child");

    if (isConnected) {
      statusDot.className = "w-3 h-3 rounded-full bg-green-500 mr-2";
      statusText.textContent = "Connected";
    } else {
      statusDot.className = "w-3 h-3 rounded-full bg-red-500 mr-2";
      statusText.textContent = "Disconnected";
    }
  }

  function handleMessage(message) {
    switch (message.type) {
      case "message":
        addMessage(message);
        break;
      case "join":
        userJoined(message);
        break;
      case "leave":
        userLeft(message);
        break;
      case "typing":
        userTyping(message);
        break;
      case "stop_typing":
        userStoppedTyping(message);
        break;
      case "user_list":
        updateUserList(message.users);
        break;
      case "history":
        loadMessageHistory(message.messages);
        break;
    }
  }

  function addMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex ${
      message.user === username ? "justify-end" : "justify-start"
    } message-enter`;

    const isCurrentUser = message.user === username;
    const colorClass = isCurrentUser
      ? "bg-indigo-100 border-indigo-200"
      : "bg-gray-100 border-gray-200";

    messageDiv.innerHTML = `
                    <div class="max-w-xs md:max-w-md lg:max-w-lg">
                        ${
                          !isCurrentUser
                            ? `
                            <div class="text-xs font-medium text-gray-500 mb-1">${message.user}</div>
                        `
                            : ""
                        }
                        <div class="rounded-lg px-4 py-2 border ${colorClass}">
                            ${message.text}
                        </div>
                        <div class="text-xs text-gray-400 text-right mt-1">
                            ${new Date(message.timestamp).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                        </div>
                    </div>
                `;

    messageContainer.appendChild(messageDiv);
    scrollToBottom();

    // Remove the initial welcome message if it exists
    const welcomeMessage = messageContainer.querySelector(".text-center");
    if (welcomeMessage) {
      welcomeMessage.remove();
    }
  }

  function userJoined(message) {
    const joinMessage = document.createElement("div");
    joinMessage.className =
      "text-center text-sm text-gray-500 py-2 message-enter";
    joinMessage.textContent = `${message.user} has joined the chat`;
    messageContainer.appendChild(joinMessage);
    scrollToBottom();

    // Add typing indicator if needed
    userTyping({ user: message.user });
  }

  function userLeft(message) {
    const leaveMessage = document.createElement("div");
    leaveMessage.className =
      "text-center text-sm text-gray-500 py-2 message-enter";
    leaveMessage.textContent = `${message.user} has left the chat`;
    messageContainer.appendChild(leaveMessage);
    scrollToBottom();

    // Remove their typing indicator if it exists
    userStoppedTyping({ user: message.user });
  }

  function userTyping(message) {
    const existingIndicator = document.getElementById(`typing-${message.user}`);
    if (!existingIndicator) {
      const typingDiv = document.createElement("div");
      typingDiv.className =
        "flex items-center text-sm text-gray-500 typing-indicator";
      typingDiv.id = `typing-${message.user}`;

      typingDiv.innerHTML = `
                        <div class="flex items-center space-x-1 ml-1 mr-2">
                            <div class="w-2 h-2 rounded-full bg-gray-400"></div>
                            <div class="w-2 h-2 rounded-full bg-gray-400"></div>
                            <div class="w-2 h-2 rounded-full bg-gray-400"></div>
                        </div>
                        <span>${message.user} is typing</span>
                    `;

      typingIndicators.appendChild(typingDiv);

      // Auto-hide after 5 seconds if no stop_typing comes
      setTimeout(() => {
        const indicator = document.getElementById(`typing-${message.user}`);
        if (
          indicator &&
          !typingIndicators.querySelector(`#typing-${message.user}`)
        ) {
          typingIndicators.removeChild(indicator);
        }
      }, 5000);
    }
  }

  function userStoppedTyping(message) {
    const indicator = document.getElementById(`typing-${message.user}`);
    if (indicator) {
      typingIndicators.removeChild(indicator);
    }
  }

  function updateUserList(userListData) {
    users = userListData;
    userList.innerHTML = "";
    userCount.textContent = `${Object.keys(userListData).length} users online`;

    Object.entries(userListData).forEach(([username, colorIndex], i) => {
      const userDiv = document.createElement("div");
      userDiv.className =
        "flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer";

      userDiv.innerHTML = `
                        <div class="relative w-8 h-8 rounded-full ${
                          avatarColors[colorIndex % avatarColors.length]
                        } flex items-center justify-center text-sm font-semibold text-white mr-2">
                            <span>${username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <div class="font-medium text-sm text-gray-800">${username}</div>
                            <div class="text-xs text-gray-500">Online</div>
                        </div>
                    `;

      userList.appendChild(userDiv);
    });
  }

  function loadMessageHistory(messages) {
    messageContainer.innerHTML = "";

    if (messages.length === 0) {
      messageContainer.innerHTML = `
                        <div class="text-center text-gray-500 text-sm py-8">
                            Welcome to the chat! Messages will appear here.
                        </div>
                    `;
      return;
    }

    messages.forEach((message) => {
      addMessage(message);
    });
  }

  function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText && isConnected) {
      const message = {
        type: "message",
        user: username,
        text: messageText,
        timestamp: new Date().toISOString(),
      };

      socket.send(JSON.stringify(message));
      messageInput.value = "";

      // Clear typing indicator
      socket.send(
        JSON.stringify({
          type: "stop_typing",
          user: username,
        })
      );
      clearTimeout(typingTimeouts[username]);
    }
  }

  function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  function toggleTheme() {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("bg-gray-900");

    if (document.body.classList.contains("dark")) {
      document.body.classList.add("bg-gray-900");
      themeToggle.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    `;
    } else {
      document.body.classList.remove("bg-gray-900");
      themeToggle.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
                        </svg>
                    `;
    }
  }

  // Mock WebSocket server for demonstration purposes
  function mockWebSocketServer(message) {
    switch (message.type) {
      case "join":
        // Generate a random color index for the user
        const colorIndex = Math.floor(Math.random() * avatarColors.length);
        users[message.user] = colorIndex;

        // Send welcome message and user list
        const welcomeMessage = {
          type: "message",
          user: "System",
          text: `Welcome to the chat, ${message.user}!`,
          timestamp: new Date().toISOString(),
        };

        socket.onmessage({ data: JSON.stringify(welcomeMessage) });

        // Send user list
        setTimeout(() => {
          socket.onmessage({
            data: JSON.stringify({
              type: "user_list",
              users: users,
            }),
          });
        }, 100);

        // For other connected clients, notify about new user
        setTimeout(() => {
          socket.onmessage({
            data: JSON.stringify({
              type: "join",
              user: message.user,
            }),
          });
        }, 200);
        break;

      case "message":
        // Broadcast message to all clients (in this demo, just echo back)
        setTimeout(() => {
          socket.onmessage({ data: JSON.stringify(message) });
        }, 100);
        break;

      case "typing":
        // Broadcast typing indicator
        setTimeout(() => {
          socket.onmessage({ data: JSON.stringify(message) });
        }, 50);
        break;

      case "stop_typing":
        // Broadcast stop typing
        setTimeout(() => {
          socket.onmessage({ data: JSON.stringify(message) });
        }, 50);
        break;
    }
  }
});
