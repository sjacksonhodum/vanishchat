# Vanish Chat

An ephemeral, playful web chat built with Flask and Socket.IO. Modern, mobile-first UI with iMessage-style reveals and fun effects.

## Features

- Join chat rooms with a 4-letter code and username
- Real-time messaging with Socket.IO
- Messages are hidden until revealed, then fade out
- iMessage-like send effects: Bubble, Echo, Slam, Gentle, and Confetti
- Effects panel and quick toggle
- Typing indicators
- Glassmorphism, subtle gradients, and micro-interactions
- Mobile-friendly layout, sticky input bar, safe-area support
- Live user list updates

## Project Structure

```
server.py
static/
    favicon.ico
    logo.png
    script.js
    style.css
templates/
    chat.html
    index.html
```

- `server.py`: Flask server with Socket.IO events for chat functionality (including typing and effects pass-through)
- `static/`: Static assets (JS, CSS, images)
- `templates/`: HTML templates for the web interface

## Getting Started

### Prerequisites

- Python 3.x
- Flask
- Flask-SocketIO

Install dependencies:

```sh
pip install flask flask-socketio
```

### Running the Server

```sh
python server.py
```

The app will be available at [http://localhost:5000](http://localhost:5000).

## Usage

1. Open the app in your browser.
2. Enter a 4-letter room code and a username.
3. Join the room and start chatting!
4. Messages are hidden until you click "Reveal", after which they gently animate and fade away.

## Customization

- Edit `static/style.css` for styling.
- Edit `static/script.js` for client-side logic.
- Edit `server.py` for server-side logic.

## Credits

Built by [@sjacksonhodum](https://github.com/sjacksonhodum).

---