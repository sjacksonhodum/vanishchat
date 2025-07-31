# Vanish Chat

A minimal, ephemeral web chat app built with Flask and Socket.IO.

## Features

- Join chat rooms with a 4-letter code and username
- Real-time messaging with Socket.IO
- Messages are hidden until revealed, then fade out
- User list updates in real time
- Simple, modern UI

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

- `server.py`: Flask server with Socket.IO events for chat functionality
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
4. Messages are hidden until you click "Reveal", after which they fade out.

## Customization

- Edit `static/style.css` for styling.
- Edit `static/script.js` for client-side logic.
- Edit `server.py` for server-side logic.

## Credits

Built by [@sjacksonhodum](https://github.com/sjacksonhodum).

---