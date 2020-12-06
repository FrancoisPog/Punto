"use_strict";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import socket_io from "socket.io";

import { supprimer, ajouter, scoresJSON, defier } from "./games/chifoumi.js";
import * as Punto from "./games/punto.js";

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
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/chat.html");
});

// cors
io.set("origins", "*:*");

const clients = {}; // { id -> socket, ... }

io.on("connection", function (socket) {
  console.log("Un client s'est connecté");
  let currentID = null;

  socket.on("login", function (id) {
    // si le pseudo est déjà utilisé, on lui envoie l'erreur
    if (clients[id]) {
      socket.emit("erreur-connexion", "Le pseudo est déjà pris.");
      return;
    }
    // sinon on récupère son ID
    debugger;
    currentID = id;
    ajouter(id);
    // initialisation
    clients[currentID] = socket;
    // log
    console.log("Nouvel utilisateur : " + currentID);
    // envoi d'un message de bienvenue à ce client

    socket.emit("bienvenue", formatList());
    // envoi aux autres clients
    socket.broadcast.emit("message", {
      from: null,
      to: null,
      text: currentID + " a rejoint la discussion",
      date: Date.now(),
    });
    // envoi de la nouvelle liste à tous les clients connectés
    socket.broadcast.emit("liste", formatList());
  });

  socket.on("message", function (msg) {
    console.log("Reçu message : " + currentID);
    // si message privé, envoi seulement au destinataire
    if (msg.to != null) {
      if (clients[msg.to] !== undefined) {
        console.log(" --> message privé");
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
    }
    // sinon, envoi à tous les gens connectés
    else {
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
    console.log(currentID + " a quitté");
    // si client était identifié
    if (currentID) {
      // envoi de l'information de déconnexion
      socket.broadcast.emit("message", {
        from: null,
        to: null,
        text: currentID + " vient de se déconnecter de l'application",
        date: Date.now(),
      });
      // suppression de l'entrée
      remove(currentID);

      // désinscription du client
      currentID = null;
      // envoi de la nouvelle liste pour mise à jour
      socket.broadcast.emit("liste", formatList());
    }
  }

  socket.on("chifoumi", function ({ to, element }) {
    let res = defier(currentID, to, element);
    switch (res.status) {
      case 1:
        clients[to].emit("chifoumi", {
          from: null,
          to,
          text: `${currentID} to défie`,
          date: Date.now(),
        });
      case -1:
      case -2:
        socket.emit("chifoumi", {
          from: 0,
          to: currentID,
          text: res.message,
          date: Date.now(),
        });
        break;
      case 0:
        if (res.resultat.vainqueur == null) {
          socket.emit("chifoumi", {
            from: 0,
            to: currentID,
            text: res.resultat.message + " :no_mouth:",
            date: Date.now(),
          });
          clients[to].emit("chifoumi", {
            from: 0,
            to: to,
            text: res.resultat.message,
            date: Date.now(),
          });
        } else {
          clients[res.resultat.vainqueur].emit("chifoumi", {
            from: 0,
            to: res.resultat.vainqueur,
            text: res.resultat.message + " - c'est gagné :grin:",
            date: Date.now(),
          });
          clients[res.resultat.perdant].emit("chifoumi", {
            from: 0,
            to: res.resultat.perdant,
            text: res.resultat.message + " - c'est perdu :frowning_face:",
            date: Date.now(),
          });
          io.sockets.emit("liste", formatList());
        }
        break;
    }
  });

  socket.on("punto", function (req) {
    if (!req || !req.action) {
      socket.emit("punto", { req, status: -1, content: "Server error" });
    }
    switch (req.action) {
      case "create": {
        createGamePunto(req);
        break;
      }
      case "invite": {
        invitePlayerPunto(req);
        break;
      }
      case "join": {
        joinGamePunto(req);
        break;
      }
      case "launch": {
        launchGamePunto(req);
        break;
      }
      case "play": {
        playGamePunto(req);
        break;
      }
      case "data": {
        gameDataPunto(req);
        break;
      }
      case "card": {
        getCardPunto(req);
        break;
      }
      case "remove": {
        removePlayerPunto(req);
        break;
      }
      default: {
        console.error("Invalid punto action : " + req.action);
      }
    }
  });

  function removePlayerPunto(req) {
    let game = Number(req.game);
    let player = req.player;
    if (!game || !player) {
      console.log(`Impossible de supprimer '${player}' de la partie ${game} !`);
      socket.emit("punto", { req, status: -1, content: "Undefined arguments" });
      return;
    }

    Punto.removePlayer(player, game);

    let gameData = JSON.parse(Punto.gameData(game));

    //socket.emit("punto", { req, status: 0 });
    for (let p in gameData.players) {
      log(p);
      clients[p].emit("punto", { req, game, gameData });
    }
  }

  function createGamePunto(req) {
    let id = Punto.createGame(currentID);
    console.log("Nouvelle partie créée par " + currentID + " : " + id);
    socket.emit("punto", { req, status: 0, game: id });
  }

  function invitePlayerPunto(req) {
    let game = Number(req.game);
    let player = req.player;
    if (!game || !player) {
      console.log(
        `Impossible d'inviter ${req.player} dans la partie ${game} : argument undefined`
      );
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.invitePlayer(game, player);

    if (res !== 0) {
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
          content =
            "Vous ne pouvez plus inviter de joueur une fois la partie lancée";
          break;
        }
        default: {
          content = "server error";
        }
      }

      socket.emit("punto", { req, status: res, content });
      return;
    }
    console.log(`${player} a bien été invité dans la partie ${game}`);

    let gameData = JSON.parse(Punto.gameData(game));

    for (let p in gameData.players) {
      if (gameData.players[p].status === "ready") {
        clients[p].emit("punto", { req, status: 0, gameData });
      }
    }

    clients[player].emit("punto", { req, status: 0 });
  }

  function joinGamePunto(req) {
    let game = Number(req.game);
    let player = req.player;
    if (!game || !player) {
      console.log(
        `Impossible pour ${player} de joindre la partie ${game} : argument undefined`
      );
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.joinGame(game, player);
    if (res !== 0) {
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
    console.log(`${player} à bien rejoint la partie ${game} ! `);
    socket.emit("punto", { req, status: 0 });
  }

  function launchGamePunto(req) {
    let game = Number(req.game);
    if (!game) {
      console.log(`[launchGamePunto] : game id undefined`);
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.launchGame(game);
    if (res !== 0) {
      let content;
      switch (res) {
        case -1: {
          content = "Cette partie n'existe pas";
          break;
        }
        case -2: {
          content =
            "Trop peu de joueur sont prêt pour lancer cette partie : 2 minimum";
          break;
        }
        default: {
          content = "Server error";
        }
      }

      socket.emit("punto", { req, status: res, content });
      return;
    }

    socket.emit("punto", { req, status: 0 });
  }

  function playGamePunto(req) {
    let game = Number(req.game);
    let index = Number(req.index);
    let player = req.player;

    if (!game || !player || !index) {
      console.log(`[playGamePunto] : arguments undefined`);
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.play(game, player, index);

    if (res !== 0) {
      let content;
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
        case 1: {
          content = "La manche est terminée";
          break;
        }
      }

      socket.emit("punto", { req, status: res, content });
      return;
    }

    socket.emit("punto", { req, status: 0 });
  }

  function gameDataPunto(req) {
    let game = Number(req.game);
    if (!game) {
      console.log(
        `Impossible d'obtenir les infos de la partie ${game} : argument undefined`
      );
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.gameData(game);
    if (typeof res !== "string") {
      let content;
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

    socket.emit("punto", { req, status: 0, content: res });
  }

  function getCardPunto(req) {
    let game = Number(req.game);
    let player = req.player;
    if (!game || !player) {
      console.log(
        `Impossible pour ${req.player} de joindre la partie ${game} : argument undefined`
      );
      socket.emit("punto", { req, status: -1, content: "Server error" });
      return;
    }

    let res = Punto.getCard(game, player);
    if (typeof res !== "string") {
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

      socket.emit("punto", { req, status: res, content });

      return;
    }

    socket.emit("punto", { req, status: 0, content: res });
  }
});

// ***** FUNCTIONS *****

function remove(id) {
  delete clients[id];
  supprimer(id);
  Punto.removePlayer(id);
}

function formatList() {
  return JSON.stringify(Object.keys(clients));
}
