from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

active_users = {}  # Stores active users per room

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

    emit("user_list", list(active_users[room]), room=room)
    emit("message", {"user": "System", "message": f"{username} has joined!"}, room=room)

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

    emit("user_list", list(active_users.get(room, [])), room=room)
    emit("message", {"user": "System", "message": f"{username} has left."}, room=room)

@socketio.on("send_message")
def handle_message(data):
    room = data.get("room")
    username = data.get("username")
    message = data.get("message")

    if not room or not message:
        return

    print(f"Message in {room}: {username} - {message}")
    emit("message", {"user": username, "message": message}, room=room)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
