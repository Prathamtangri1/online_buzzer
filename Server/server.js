const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);
const server = http.createServer(app);

const io = socketIo(server);
let gameIdCurrent = 123;

let games = [];

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.send('Testing message');

  let gameId = ''; 
  let pName = '';
  let host = '';

  socket.on('message', data => {
    console.log("pName: " + pName + " data: " + data);
    if(data === 'timer_start' || data === 'timer_stop' || data === 'timer_reset') {
      if(gameId !== '') {
        socket.to(gameId).send(data);
      }
    }
  });

  socket.on('request_gameId', (timer) => {
    gameId = gameIdCurrent.toString();
    gameIdCurrent++;

    socket.emit('new_gameId', gameId);
    host = socket.id;
    console.log("new client: ", socket.id);

    socket.join(gameId);

    games.push({gameId: gameId, host: host, nPlayers: 0, pNames: [], pIds: [], timer: timer});

    console.log(games);
  })

  
  socket.on('join_room', data => {
    let flag = 0;
    for(element of games){
      if (element.gameId === data.gameId) {
        flag = 1;
        if (element.pNames.indexOf(data.pName) === -1) {
          ++element.nPlayers;
          element.pNames.push(data.pName);
          element.pIds.push(socket.id);

          socket.join(data.gameId);
          console.log("name: " + data.pName + " socket id: " + socket.id);                                      
          gameId = data.gameId;
          pName = data.pName;
          host = element.host;

          console.log(games);
          socket.emit('join_room_response', 'Successful');
          socket.emit("timer_change", element.timer);

          io.to(element.host).emit('new_player', pName);
        }
        else {
          socket.emit('join_room_response','pName_repeat');
        }
        break;
      }
    };
    
    if(flag === 0)
      socket.emit('join_room_response','gameId doesn\'t exist');
  });

  socket.on("player_delete", (pName) => {
    let player_id = '';

    let flag = 0;
    for(element of games){
      if (element.gameId === gameId) {
        flag = 1;
        player_id = element.pIds[element.pNames.indexOf(pName)];
        break;
      }
    };

    if(flag === 0)
      socket.emit("player_delete_response", "player to delete doesn't exist");
    else {
      console.log('player_id: ' + player_id + ' pName: ' + pName);
      // let players_room = io.sockets.adapter.rooms[gameId].sockets;
      // console.log(players_room);

      io.sockets.connected[player_id].disconnect(true);
      
      // socket.emit('player_disconnected', pName);
    }
  });

  socket.on("player_buzzed", (data) => {
    console.log("p: " + data.pName + " pressed buzzer");
    io.to(host).emit('player_buzzed', data);
  });

  socket.on("timer_change", (data) => {
    console.log("timer_changed");
    console.log(data);

    for(element of games){
      if (element.gameId === gameId) {
        element.timer = data;
        break;
      }
    };

    socket.to(gameId).emit("timer_change", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");

    for(element of games){
      if (element.gameId === gameId) {
        if (socket.id !== element.host) {
          --element.nPlayers;
          element.pIds.splice(element.pNames.indexOf(pName), 1);
          element.pNames.splice(element.pNames.indexOf(pName), 1);
        }
        else if (socket.id == element.host) {
          element.host = undefined;
        }

        if(element.host === undefined) {
          if((gameIdCurrent-1).toString() === element.gameId) {
            gameIdCurrent--;
            
            //if possible, add code so that the minimum gameId available is used
          }

          games.splice(games.indexOf(element), 1);
        }

        if(io.sockets.connected[element.host]){
          io.sockets.connected[element.host].emit('player_disconnected', pName);
          console.log("player sent for delete: " + pName);
        }
        // socket.emit('player_disconnected', pName);
        break;
      }
    };

    console.log(games);

  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

//when a player disconnects, it should be visible to the host
//change player object, gameId is first key, then uske andar object, and usme player and ids.