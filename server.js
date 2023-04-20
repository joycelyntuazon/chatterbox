const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const{ userJoin, getCurrentUser, userLeaves, getRoomUsers } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

//Set static folder
app.use(express.static(path.join(__dirname, 'frontend')));

const admin = 'Chatterbox Buddy';

//Run when client connects
io.on('connection', socket => {

    //What happens when connect
    socket.on('joinRoom', ({ username, room }) => {

        //Join
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);

        //Welcome user
        socket.emit('broadcast', formatMessage(admin, 'Welcome to Chatterbox!'));

        //Broadcast when a user connects
        socket.broadcast.to(user.room).emit('broadcast', formatMessage(admin, `${user.username} has joined the chat!`));

        //Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });

        //Listen for chatMessage
        socket.on('chatMessage', msg => {
            const user = getCurrentUser(socket.id);
            io.to(user.room).emit('broadcast', formatMessage(user.username, msg));
        });

        //When a client disconnects
        socket.on('disconnect', () => {
            const user = userLeaves(socket.id);
            //Remove user from array of users in room
            if(user) {
                io.to(user.room).emit('broadcast', formatMessage(admin, `${user.username} has left the chat.`));
                //Send users and room info
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getRoomUsers(user.room)
                });
            }
        });

    });

});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));