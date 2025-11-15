const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const path=require('path');
const RoomManager=require('./rooms');
const app=express();
const server=http.createServer(app);
const io=new Server(server);
const rooms=new RoomManager();
app.use(express.static(path.join(__dirname,'..','client')));
io.on('connection',socket=>{
  const room='main';
  rooms.join(room,socket.id);
  socket.join(room);
  socket.emit('init',{clientId:socket.id,roomState:rooms.getState(room)});
  io.to(room).emit('userlist',{users:rooms.getUsers(room)});
  socket.on('draw-complete',p=>{
    rooms.appendOp(room,p.op,socket.id);
    io.to(room).emit('peer-draw',{op:p.op});
  });
  socket.on('undo',()=>{rooms.undo(room);io.to(room).emit('history',{ops:rooms.getState(room).history})});
  socket.on('redo',()=>{rooms.redo(room);io.to(room).emit('history',{ops:rooms.getState(room).history})});
  socket.on('disconnect',()=>{rooms.leave(room,socket.id);io.to(room).emit('userlist',{users:rooms.getUsers(room)})});
});
server.listen(3000);
