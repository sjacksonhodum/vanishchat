const socket = io();

// State
let currentRoom = null;
let currentUser = null;
let currentEffect = 'none';
let typingTimeout = null;
let persistenceEnabled = false;
let votes = 0;
let total = 0;
let roomKey = null; // CryptoKey for encryption

// Helpers
function el(id) { return document.getElementById(id); }
function scrollToBottom() { const m = el('messages'); m.scrollTop = m.scrollHeight; }
function setRoomPill() { const pill = el('room-name'); if (pill && currentRoom) pill.textContent = `#${currentRoom}`; }

function selectEffect(name) {
    currentEffect = name;
    document.querySelectorAll('#effects-panel .chip').forEach(c => c.classList.toggle('selected', c.dataset.effect === name));
}

// Join flow
function joinRoom() {
    const roomCode = el("room-code").value.trim().toUpperCase();
    const username = el("username").value.trim();
    if (!roomCode || !username) { alert('Enter both room code and username.'); return; }

    currentRoom = roomCode; currentUser = username;
    socket.emit("join", { room: roomCode, username });

    el("join-room").style.display = "none";
    el("chat-room").style.display = "block";
    el("message-input").dataset.username = username;
    setRoomPill();
    setTimeout(scrollToBottom, 50);

        // Derive a room key for E2E encryption from the room code
        deriveRoomKey(roomCode).then(k => roomKey = k).catch(() => (roomKey = null));
}

// Message send
function sendMessage() {
    const input = el("message-input");
    const msg = input.value.trim();
    if (!msg || !currentRoom) return;
    // Encrypt if key available
    maybeEncrypt(msg).then(({ cipher, iv, enc }) => {
        socket.emit("send_message", { room: currentRoom, username: currentUser, message: cipher, iv, enc, effect: currentEffect });
        input.value = "";
    });
    socket.emit("typing", { room: currentRoom, username: currentUser, typing: false });
}

// Typing indicator
function handleTyping() {
    if (!currentRoom) return;
    socket.emit("typing", { room: currentRoom, username: currentUser, typing: true });
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit("typing", { room: currentRoom, username: currentUser, typing: false }), 1500);
}

// Effects panel toggle
const effectsToggle = () => el('effects-panel').classList.toggle('hidden');

// Socket events
socket.on("message", (data) => {
    // System messages: show immediately, no reveal
    if (data.user === 'System') {
        const sys = document.createElement('div');
        sys.className = 'system appear';
        sys.textContent = data.message;
        el('messages').appendChild(sys);
        scrollToBottom();
        return;
    }

    const wrapper = document.createElement('div');
    const isMe = data.user === currentUser;
    wrapper.className = `message ${isMe ? 'me' : 'other'} appear`;

    // Bubble
    const bubble = document.createElement('div');
    bubble.className = `bubble ${isMe ? 'me' : 'other'} hidden-text`;
    bubble.setAttribute('role', 'text');
    bubble.textContent = '••••••••••••••••••';

    // Meta + reveal
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = data.user || 'System';

    const reveal = document.createElement('button');
    reveal.className = 'reveal-btn';
    reveal.textContent = 'Reveal';
    reveal.addEventListener('click', () => {
        maybeDecrypt(data).then((plaintext) => {
            bubble.textContent = plaintext;
            bubble.classList.remove('hidden-text'); // blur fades out via CSS transition
            applyEffect(wrapper, bubble, data.effect || 'none');
            if (!persistenceEnabled) {
                setTimeout(() => {
                    wrapper.classList.add('fade-out');
                    setTimeout(() => wrapper.remove(), 950);
                }, 2500);
            }
        });
    }, { once: true });

    wrapper.appendChild(meta); // sender label above
    wrapper.appendChild(bubble);
    wrapper.appendChild(reveal);
    el('messages').appendChild(wrapper);
    scrollToBottom();
});
// Persistence state and controls
socket.on('persistence_state', ({ enabled, votes: v, total: t }) => {
    persistenceEnabled = !!enabled; votes = v || 0; total = t || 0;
    const btn = el('keep-toggle');
    if (btn) btn.textContent = enabled ? 'Keeping messages' : `Keep? ${votes}/${total}`;
    const destroy = el('destroy');
    if (destroy) destroy.classList.toggle('hidden', !enabled);
});

socket.on('destroy_messages', ({ by }) => {
    // Wipe visible messages
    const m = el('messages');
    Array.from(m.children).forEach(ch => ch.classList.add('fade-out'));
    setTimeout(() => m.replaceChildren(), 1000);
    const sys = document.createElement('div');
    sys.className = 'system appear';
    sys.textContent = `All messages destroyed by ${by}`;
    m.appendChild(sys);
});

socket.on('user_list', (users) => {
    el('active-users').textContent = 'Users: ' + users.join(', ');
});

socket.on('typing', ({ user }) => {
    if (!user || user === currentUser) return;
    const tip = el('typing-indicator');
    if (!tip) return;
    tip.textContent = `${user} is typing…`;
    tip.classList.remove('hidden');
    setTimeout(() => tip.classList.add('hidden'), 1200);
});

// Apply visual effects
function applyEffect(wrapper, bubble, effect) {
    switch (effect) {
        case 'bubble': bubble.classList.add('fx-bubble'); break;
        case 'echo': bubble.classList.add('fx-echo'); break;
        case 'slam': bubble.classList.add('fx-slam'); break;
        case 'gentle': bubble.classList.add('fx-gentle'); break;
        case 'confetti': doConfetti(); break;
        default: break;
    }
}

function doConfetti() {
    let layer = document.querySelector('.confetti');
    if (!layer) { layer = document.createElement('div'); layer.className = 'confetti'; document.body.appendChild(layer); }
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + 'vw';
        p.style.background = `hsl(${Math.random()*360}, 90%, 60%)`;
        p.style.animationDelay = (Math.random()*300) + 'ms';
        p.style.transform = `translateY(-10vh) rotate(${Math.random()*360}deg)`;
        layer.appendChild(p);
        setTimeout(() => p.remove(), 1700);
    }
}

// Input bindings
const msgInput = document.getElementById('message-input');
if (msgInput) {
    msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
    msgInput.addEventListener('input', handleTyping);
}

// Effects chips
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.id === 'effects-toggle') { effectsToggle(); }
    if (t && t.matches('#effects-panel .chip')) { selectEffect(t.dataset.effect); }
    if (t && t.id === 'keep-toggle') { 
        if (!currentRoom) return; 
        socket.emit('vote_persistence', { room: currentRoom, username: currentUser }); 
    }
    if (t && t.id === 'destroy') { 
        if (!currentRoom || !persistenceEnabled) return; 
        socket.emit('request_destroy', { room: currentRoom, username: currentUser }); 
    }
});

// Leave room
function leaveRoom() {
    if (!currentRoom) return;
    socket.emit('leave', { room: currentRoom, username: currentUser });
    el('chat-room').style.display = 'none';
    el('join-room').style.display = 'block';
    currentRoom = null; currentUser = null;
}

// Expose for inline handlers
window.joinRoom = joinRoom;
window.sendMessage = sendMessage;
window.leaveRoom = leaveRoom;

// Encryption helpers (AES-GCM, key derived from room code)
async function deriveRoomKey(roomCode) {
    const enc = new TextEncoder();
    const salt = enc.encode('vanish-salt');
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(roomCode), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function maybeEncrypt(plaintext) {
    if (!roomKey || !window.crypto?.subtle) {
        return { cipher: plaintext, enc: false };
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, roomKey, new TextEncoder().encode(plaintext));
    return { cipher: b64(new Uint8Array(ct)), iv: b64(iv), enc: true };
}

async function maybeDecrypt(data) {
    if (!data.enc || !roomKey || !window.crypto?.subtle) return `${data.message}`;
    try {
        const iv = ub64(data.iv);
        const ct = ub64(data.message);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, roomKey, ct);
        return new TextDecoder().decode(pt);
    } catch {
        return '[unable to decrypt]';
    }
}

function b64(buf) { return btoa(String.fromCharCode(...buf)); }
function ub64(str) { const bin = atob(str); const arr = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr; }