import './styles/style.css';

class ChatClient {
    constructor() {
        this.ws = null;
        this.currentUser = null;
        this.users = [];
        this.init();
    }

    init() {
        this.showNicknameModal();
        this.bindEvents();
    }

    showNicknameModal() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="modal" id="nicknameModal">
                <div class="modal-content">
                    <h2>Выберите псевдоним</h2>
                    <div id="errorMessage" class="error hidden"></div>
                    <input type="text" id="nicknameInput" placeholder="Введите ваш псевдоним">
                    <button id="continueBtn">Продолжить</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('continueBtn').addEventListener('click', () => {
            this.handleNicknameSubmit();
        });

        document.getElementById('nicknameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleNicknameSubmit();
            }
        });
    }

    async handleNicknameSubmit() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        const errorElement = document.getElementById('errorMessage');

        if (!nickname) {
            errorElement.textContent = 'Псевдоним не может быть пустым';
            errorElement.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('https://websocket-chat-server.onrender.com/new-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: nickname })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                this.currentUser = data.user;
                this.hideNicknameModal();
                this.connectToWebSocket();
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Ошибка регистрации');
        }
    }

    connectToWebSocket() {
        const wsUrl = 'wss://websocket-chat-server.onrender.com';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.renderChatInterface();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (Array.isArray(data)) {
                    this.updateUsersList(data);
                } else if (data.type === 'send') {
                    this.addMessage(data);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showError('Ошибка соединения с сервером');
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        window.addEventListener('beforeunload', () => {
            if (this.ws && this.currentUser) {
                this.ws.send(JSON.stringify({
                    type: 'exit',
                    user: { name: this.currentUser.name }
                }));
            }
        });
    }

    hideNicknameModal() {
        document.getElementById('nicknameModal').classList.add('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    renderChatInterface() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="chat-container">
                <div class="users-sidebar">
                    <h3>Участники</h3>
                    <ul class="user-list" id="userList"></ul>
                </div>
                <div class="chat-main">
                    <div class="messages-container" id="messagesContainer"></div>
                    <div class="input-container">
                        <input type="text" id="messageInput" placeholder="Type your message here">
                        <button id="sendBtn">Отправить</button>
                    </div>
                </div>
            </div>
        `;

        this.bindChatEvents();
    }

    bindChatEvents() {
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();

        if (message && this.ws && this.currentUser) {
            const messageData = {
                type: 'send',
                message: message,
                user: this.currentUser
            };

            this.ws.send(JSON.stringify(messageData));
            input.value = '';
        }
    }

    updateUsersList(users) {
        this.users = users;
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-item';
            li.textContent = user.name;
            li.dataset.userId = user.id;
            userList.appendChild(li);
        });
    }

    addMessage(data) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');

        const isOwnMessage = this.currentUser && data.user.id === this.currentUser.id;
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;

        const time = new Date().toLocaleTimeString();

        messageElement.innerHTML = `
            <div class="message-header">${isOwnMessage ? 'You' : data.user.name}</div>
            <div class="message-text">${this.formatMessage(data.message)}</div>
            <div class="message-time">${time}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }
}

new ChatClient();
