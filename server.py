from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

active_users = {}  # Stores active users per room
# Room-level settings: persistence (keep messages until destroy) and votes for enabling it
room_settings = {}  # { room: { 'persistence_enabled': bool, 'votes': set(usernames) } }

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("join")
def handle_join(data):
    room = data.get("room")
    username = data.get("username")

    if not room or not username:
        return

    print(f"User {username} joined room {room}")
    join_room(room)

    if room not in active_users:
        active_users[room] = set()
    active_users[room].add(username)

    # Ensure room settings
    if room not in room_settings:
        room_settings[room] = { 'persistence_enabled': False, 'votes': set() }

    emit("user_list", list(active_users[room]), room=room)
    emit("message", {"user": "System", "message": f"{username} has joined!"}, room=room)
    # Broadcast current persistence state and vote counts
    settings = room_settings[room]
    emit("persistence_state", {
        "enabled": settings['persistence_enabled'],
        "votes": len(settings['votes']),
        "total": len(active_users[room])
    }, room=room)

@socketio.on("leave")
def handle_leave(data):
    room = data.get("room")
    username = data.get("username")

    if not room or not username:
        return

    print(f"User {username} left room {room}")
    leave_room(room)

    if room in active_users and username in active_users[room]:
        active_users[room].remove(username)
        if not active_users[room]:  
            del active_users[room]  
            # Also clear room settings when last user leaves
            room_settings.pop(room, None)
        else:
            # If user had voted, remove their vote and update counts
            if room in room_settings and username in room_settings[room]['votes']:
                room_settings[room]['votes'].remove(username)

    emit("user_list", list(active_users.get(room, [])), room=room)
    emit("message", {"user": "System", "message": f"{username} has left."}, room=room)
    # Update persistence state after a user leaves (vote counts may change)
    if room in room_settings and room in active_users:
        settings = room_settings[room]
        emit("persistence_state", {
            "enabled": settings['persistence_enabled'],
            "votes": len(settings['votes']),
            "total": len(active_users[room])
        }, room=room)

@socketio.on("send_message")
def handle_message(data):
    room = data.get("room")
    username = data.get("username")
    message = data.get("message")
    effect = data.get("effect")
    enc = data.get("enc")  # if True, message may be encrypted and in data['cipher']

    if not room or not message:
        return

    if enc:
        print(f"Encrypted message in {room} from {username} (len={len(message) if isinstance(message, str) else 'n/a'})")
    else:
        print(f"Message in {room}: {username} - {message}")
    # Pass through effect and encryption markers
    emit("message", {"user": username, "message": message, "effect": effect, "enc": enc, "iv": data.get("iv")}, room=room)


@socketio.on("typing")
def handle_typing(data):
    room = data.get("room")
    username = data.get("username")
    is_typing = data.get("typing", True)
    if not room or not username:
        return
    if is_typing:
        emit("typing", {"user": username}, room=room, include_self=False)


@socketio.on("vote_persistence")
def vote_persistence(data):
    room = data.get("room")
    username = data.get("username")
    if not room or not username:
        return
    if room not in active_users or username not in active_users[room]:
        return
    if room not in room_settings:
        room_settings[room] = { 'persistence_enabled': False, 'votes': set() }
    settings = room_settings[room]
    if settings['persistence_enabled']:
        # already enabled, just rebroadcast state
        emit("persistence_state", {"enabled": True, "votes": len(settings['votes']), "total": len(active_users[room])}, room=room)
        return
    settings['votes'].add(username)
    # Check consensus
    if settings['votes'] == active_users[room]:
        settings['persistence_enabled'] = True
        settings['votes'].clear()
        emit("persistence_state", {"enabled": True, "votes": 0, "total": len(active_users[room])}, room=room)
        emit("message", {"user": "System", "message": "Message persistence is now enabled for this room."}, room=room)
    else:
        emit("persistence_state", {"enabled": False, "votes": len(settings['votes']), "total": len(active_users[room])}, room=room)


@socketio.on("request_destroy")
def request_destroy(data):
    room = data.get("room")
    username = data.get("username")
    if not room or not username:
        return
    settings = room_settings.get(room)
    if not settings or not settings['persistence_enabled']:
        return
    print(f"Destroy requested in {room} by {username}")
    emit("destroy_messages" , {"by": username}, room=room)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
