"use_strict";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import socket_io from "socket.io";

import * as Punto from "./games/punto.js";

// Set up the server
dotenv.config();
const __dirname = path.resolve();

const app = express();
const port = process.env.PORT || 8080;

const server = app.listen(port, function () {
  console.log("C'est parti ! En attente de connexion sur le port " + port);
});

// Listen web sockets
const io = socket_io.listen(server);

// Serve the public directory
app.use(express.static("public"));
app.get("/", function (_, res) {
  res.sendFile(__dirname + "/public/chat.html");
});

// cors
io.set("origins", "*:*");

const clients = {}; // { id -> socket, ... }

// ********************************************************
//                        SOCKETS
// ********************************************************

io.on("connection", function (socket) {
  console.log("Un client s'est connecté");
  let currentID = null;

  socket.on("login", function (id) {
    // send error if the pseudo is already used
    if (clients[id]) {
      socket.emit("erreur-connexion", "Le pseudo est déjà pris.");
      return;
    }

    // set the user ID & socket
    currentID = id;
    clients[currentID] = socket;
    console.log("Nouvel utilisateur : " + currentID);
    socket.emit("bienvenue", formatList());

    // notify other users
    socket.broadcast.emit("message", {
      from: null,
      to: null,
      text: currentID + " a rejoint la discussion",
      date: Date.now(),
    });
    // Send the new list
    socket.broadcast.emit("liste", formatList());
  });

  socket.on("message", function (msg) {
    if (!currentID) {
      return;
    }
    console.log("Received message : " + currentID);

    if (msg.to != null) {
      if (clients[msg.to] !== undefined) {
        console.log(" --> private message");
        clients[msg.to].emit("message", {
          from: currentID,
          to: msg.to,
          text: msg.text,
          date: Date.now(),
        });
        if (currentID !== msg.to) {
          socket.emit("message", {
            from: currentID,
            to: msg.to,
            text: msg.text,
            date: Date.now(),
          });
        }
      } else {
        socket.emit("message", {
          from: null,
          to: currentID,
          text: "Utilisateur " + msg.to + " inconnu",
          date: Date.now(),
        });
      }
    } else {
      console.log(" --> broadcast");
      io.sockets.emit("message", {
        from: currentID,
        to: null,
        text: msg.text,
        date: Date.now(),
      });
    }
  });

  socket.on("logout", leave);

  socket.on("disconnect", leave);

  function leave() {
    console.log(currentID + " left the app");
    if (currentID) {
      // notify other users
      socket.broadcast.emit("message", {
        from: null,
        to: null,
        text: currentID + " vient de se déconnecter de l'application",
        date: Date.now(),
      });

      // Have the AI ​​play for this player in all games where he is the current player
      JSON.parse(Punto.getGames(currentID)).forEach((g) => {
        let data = JSON.parse(Punto.gameData(g));
        if (data.status === "running" && data.currentPlayer === currentID) {
          playAutoPunto(currentID, g);
        }
      });

      // delete user id & socket
      remove(currentID);
      currentID = null;

      // Send the updated list
      socket.broadcast.emit("liste", formatList());
    }
  }

  socket.on("punto", function (req) {
    if (!currentID) {
      return;
    }
    if (!req || !req.action) {
      socket.emit("punto", { req, status: -1, content: "Server error" });
    }
    switch (req.action) {
      case "create": {
        createGamePunto(req, socket, currentID);
        break;
      }
      case "invite": {
        invitePlayerPunto(req, socket);
        break;
      }
      case "join": {
        joinGamePunto(req, socket);
        break;
      }
      case "launch": {
        launchGamePunto(req, socket);
        break;
      }
      case "play": {
        playGamePunto(req, socket);
        break;
      }
      case "data": {
        gameDataPunto(req, socket);
        break;
      }
      case "card": {
        getCardPunto(req, socket);
        break;
      }
      case "remove": {
        removePlayerPunto(req, socket);
        break;
      }
      case "next": {
        nextRoundPunto(req, socket);
        break;
      }
      case "winner": {
        getWinnerPunto(req, currentID);
        break;
      }
      default: {
        console.error("Invalid punto action : " + req.action);
      }
    }
  });
});

// ********************************************************
//                        FUNCTIONS
// ********************************************************

/**
 * Remove a player from a punto game
 * @param {
 *  { action : string,
 *    game : number,
 *    player : string
 *  }
 *  } req The socket request
 */
function removePlayerPunto(req) {
  let game = Number(req.game);
  let player = req.player;
  if (!game || !player) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let gameDataBefore = JSON.parse(Punto.gameData(game));
  // check if this game exists
  if (gameDataBefore === -1) {
    clients[player].emit("punto", { req, status: 0 });
    return;
  }

  // If the removed player is the current player -> AI
  if (gameDataBefore.status === "running" && gameDataBefore.currentPlayer === req.player) {
    playAutoPunto(req.player, game);
  }

  // Remove the player
  Punto.removePlayer(player, game);

  // Get game data after deletion
  let gameData = Punto.gameData(game);

  // If the game doesn't exist anymore (i.e the removed player was the last ready player )
  if (gameData === -1) {
    // Notify all potentially pending players that this game no longer exists
    for (let p in gameDataBefore.players) {
      if (clients[p] && gameDataBefore.players[p].status === "pending") {
        clients[p].emit("punto", { req, status: 1 });
      }
    }
  } else {
    // Notify other players of this game that the player was removed
    for (let p in JSON.parse(gameData).players) {
      if (clients[p]) {
        clients[p].emit("punto", {
          req,
          status: 0,
        });
      }
    }
  }

  // Notify the removed player
  if (clients[player]) {
    clients[player].emit("punto", { req, status: 0 });
  }
}

/**
 * Create a new punto game
 * @param {{action : string}} req The socket request
 * @param {string} currentID The creator pseudo
 */
function createGamePunto(req, socket, currentID) {
  let id = Punto.createGame(currentID);

  // Notify the player that the game was created and send its ID
  socket.emit("punto", { req, status: 0, game: id });
}

/**
 * Invite a player in a punto game
 * @param {{action : string, game : id, player : string}} req The socket request
 */
function invitePlayerPunto(req, socket) {
  let game = Number(req.game);
  let player = req.player;
  if (!game || !player) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  // Check that the player exists
  if (!clients[player]) {
    socket.emit("punto", { req, status: -4, content: "Joueur inconnu" });
    return;
  }

  // Invite the player
  let res = Punto.invitePlayer(game, player);

  if (res !== 0) {
    // Notify the player that an error has occured
    let content;
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Vous ne pouvez plus inviter de joueur : 4 joueurs maximum";
        break;
      }
      case -3: {
        content = "Vous ne pouvez plus inviter de joueur une fois la partie lancée";
        break;
      }
      default: {
        content = "server error";
      }
    }

    socket.emit("punto", { req, status: res, content });
    return;
  }

  let gameData = JSON.parse(Punto.gameData(game));

  // Notify all players in this game that the player was invited
  for (let p in gameData.players) {
    if (clients[p] && gameData.players[p].status === "ready") {
      clients[p].emit("punto", { req, status: 0, gameData });
    }
  }

  // Notify the invited player
  if (clients[player]) {
    clients[player].emit("punto", { req, status: 0 });
  }
}

/**
 * Join a punto game
 * @param {{action : string, game : id, player : string}} req
 */
function joinGamePunto(req, socket) {
  let game = Number(req.game);
  let player = req.player;
  if (!game || !player) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  // Check that the player exists
  if (!clients[player]) {
    socket.emit("punto", { req, status: -4, content: "Joueur inconnu" });
    return;
  }

  let res = Punto.joinGame(game, player);
  if (res !== 0) {
    // Notify the player that an error has occured
    let content;
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Vous n'êtes pas inviter à cette partie";
        break;
      }
      case -3: {
        content = "Vous ne pouvez pas rejoindre une partie une fois lancée";
        break;
      }
      default: {
        content = "server error";
      }
    }

    socket.emit("punto", { req, status: res, content });
    return;
  }

  let players = JSON.parse(Punto.gameData(game)).players;

  // Notify all players in this game that the player joined
  for (let p in players) {
    if (clients[p]) {
      clients[p].emit("punto", { req, status: 0 });
    }
  }
}

/**
 * Launch a punto game
 * @param {{action : string, game : id}} req
 */
function launchGamePunto(req, socket) {
  let game = Number(req.game);
  if (!game) {
    socket.emit("punto", { req, status: -1, content: "undefined arguments" });
    return;
  }

  // Get the players before the game launch (in order to keep track of pending players who will be removed during launch)
  let dataBefore = JSON.parse(Punto.gameData(game));
  let playersBeforeLaunch = [];
  if (dataBefore) {
    playersBeforeLaunch = Object.keys(dataBefore.players);
  }

  // Launch the game
  let res = Punto.launchGame(game);
  if (res !== 0) {
    // Notify the player that an error has occured
    let content;
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Trop peu de joueur sont prêt pour lancer cette partie : 2 minimum";
        break;
      }
      default: {
        content = "Server error";
      }
    }

    socket.emit("punto", { req, status: res, content });
    return;
  }

  // Get the players still playing after the game launch
  let playersAfterLaunch = Object.keys(JSON.parse(Punto.gameData(game)).players);

  for (let p of playersBeforeLaunch) {
    if (!clients[p]) {
      continue;
    }
    if (playersAfterLaunch.includes(p)) {
      // Notify ready players that the game was launched
      clients[p].emit("punto", { req, status: 0 });
    } else {
      // Notify pending players that they are removed from the game
      clients[p].emit("punto", {
        req: { action: "remove", game, player: p },
        status: 0,
      });
    }
  }
}

/**
 * Play to a punto game
 * @param {{action : string, game : number, player : string, index : number}} req
 */
function playGamePunto(req, socket) {
  let game = Number(req.game);
  let index = Number(req.index);
  let player = req.player;

  if (!game || !player || !Number.isInteger(index)) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let res = Punto.play(game, player, index);

  if (res < 0) {
    let content;
    // Notify the player that an error has occured
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Ce joueur ne participe pas à cette partie";
        break;
      }
      case -3: {
        content = "Cette carte ne peut pas être posé ici";
        break;
      }
      case -4: {
        content = "Vous devez attendre votre tour pour jouer";
        break;
      }
      case -5: {
        content = "La partie n'est pas en cours de jeu";
        break;
      }
    }

    socket.emit("punto", { req, status: res, content });
    return;
  }

  let finished = typeof res === "object";

  let data = JSON.parse(Punto.gameData(req.game));
  let card = data.board[req.index];
  for (let p in data.players) {
    if (!clients[p] || data.players[p].status === "left") {
      continue;
    }
    // Send the game status after this turn to all players
    clients[p].emit("punto", {
      req,
      status: finished ? 1 : 0,
      card,
      next: finished ? null : data.currentPlayer,
      winner: finished ? res.winner : null,
    });
  }

  // If the next player is left -> AI
  if (!finished && data.players[data.currentPlayer].status === "left") {
    playAutoPunto(data.currentPlayer, game);
  }
}

/**
 * Get data from a punto game
 * @param {action : string, game : number} req
 */
function gameDataPunto(req, socket) {
  let game = Number(req.game);
  if (!game) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let res = Punto.gameData(game);
  if (typeof res !== "string") {
    let content;
    // Notify the player that an error has occured
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      default: {
        content = "server error";
        break;
      }
    }
    socket.emit("punto", { req, status: res, content });
    return;
  }

  // Send the data to the player
  socket.emit("punto", { req, status: 0, content: res });
}

/**
 * Get the card of the current player
 * @param {{action : string, game : number, player : string}} req
 */
function getCardPunto(req, socket) {
  let game = Number(req.game);
  let player = req.player;
  if (!game || !player) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let res = Punto.getCard(game, player);
  if (typeof res !== "string") {
    let content;
    // Notify the player that an error has occured
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Ce joueur ne participe pas à cette partie";
        break;
      }
      case -3: {
        content = "Impossible de voir sa carte avant son tour";
        break;
      }
      default: {
        content = "server error";
        break;
      }
    }

    // Send the card to the player
    socket.emit("punto", { req, status: res, content });
    return;
  }

  socket.emit("punto", { req, status: 0, content: res });
}

/**
 * Launch the next round of a punto game
 * @param {{action : string, game : number}} req
 */
function nextRoundPunto(req, socket) {
  let game = Number(req.game);
  if (!game) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let res = Punto.nextRound(game);
  if (res < 0) {
    let content;
    // Notify the player that an error has occured
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "Ce n'est pas le moment de passer au tour suivant";
        break;
      }
      default: {
        content = "server error";
        break;
      }
    }
    socket.emit("punto", { req, status: res, content });
    return;
  }

  let data = JSON.parse(Punto.gameData(req.game));
  for (let p in data.players) {
    // Notify all players that the next round was launched
    if (clients[p] && data.players[p].status === "ready") {
      clients[p].emit("punto", { req, status: res });
    }
  }
}

/**
 * Get the final winner of a punto game
 * @param {{action : string, game : number}} req
 */
function getWinnerPunto(req, socket) {
  let game = Number(req.game);
  if (!game) {
    socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
    return;
  }

  let data = JSON.parse(Punto.gameData(game));
  if (data === -1) {
    socket.emit("punto", { req, status: -1, content: "Cette partie n'existe pas" });
    return;
  }
  // Get the players of the game
  let players = data.players;

  let res = Punto.gameResult(game);
  if (typeof res === "number") {
    let content;
    // Notify the player that an error has occured
    switch (res) {
      case -1: {
        content = "Cette partie n'existe pas";
        break;
      }
      case -2: {
        content = "La partie n'est pas terminée";
        break;
      }
      default: {
        content = "server error";
        break;
      }
    }
    socket.emit("punto", { req, status: res, content });
    return;
  }

  // Send the winner to all players
  for (let p in players) {
    if (clients[p] && data.players[p].status === "ready") {
      clients[p].emit("punto", { req, status: 0, winner: res.winner });
    }
  }
}

/**
 * Have the player play automatically by an AI
 * @param {string} player
 * @param {number} game
 */
function playAutoPunto(player, game) {
  // Keep the board before playin
  let dataBefore = JSON.parse(Punto.gameData(game));
  if (dataBefore === -1) {
    return;
  }
  let boardBefore = dataBefore.board;

  // Play automaticcaly
  let res = Punto.play(game, player, -1);

  // Get the board after playing
  let data = JSON.parse(Punto.gameData(game));
  let boardAfter = data.board;

  // Find the index and the card that the AI  played
  let index = null;
  for (let i of Array(36).keys()) {
    if (boardAfter[i] === null) {
      continue;
    }

    if (
      (boardBefore[i] === null && boardAfter[i] !== null) ||
      boardAfter[i].color !== boardBefore[i].color ||
      boardAfter[i].value !== boardBefore[i].value
    ) {
      index = i;
      break;
    }
  }

  let finished = typeof res === "object";

  let card = boardAfter[index];
  for (let p in data.players) {
    if (!clients[p] || data.players[p].status === "left") {
      continue;
    }
    // Send the game status after this turn to all players
    clients[p].emit("punto", {
      req: {
        action: "play",
        index,
        player,
        game,
      },
      status: finished ? 1 : 0,
      card,
      next: finished ? null : data.currentPlayer,
      winner: finished ? res.winner : null,
    });
  }

  // If the next players is left -> AI
  if (data.players[data.currentPlayer].status === "left") {
    playAutoPunto(data.currentPlayer, game);
  }
}

/**
 * Remove a user
 * @param {string} id
 */
function remove(id) {
  delete clients[id];
  Punto.removePlayer(id);
}

/**
 * Format the list to send to clients
 */
function formatList() {
  return JSON.stringify(Object.keys(clients));
}
