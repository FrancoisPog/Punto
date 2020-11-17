import express from "express";
import { supprimer, ajouter, scoresJSON, defier } from "./chifoumi.js";
import socket_io from "socket.io";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const __dirname = path.resolve();

const app = express();
const port = process.env.PORT || 8080;
const server = app.listen(port, function () {
  console.log("C'est parti ! En attente de connexion sur le port" + port);
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

function remove(id) {
  delete clients[id];
  supprimer(id);
}

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

    socket.emit("bienvenue", scoresJSON());
    // envoi aux autres clients
    socket.broadcast.emit("message", {
      from: null,
      to: null,
      text: currentID + " a rejoint la discussion",
      date: Date.now(),
    });
    // envoi de la nouvelle liste à tous les clients connectés
    socket.broadcast.emit("liste", scoresJSON());
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

  socket.on("logout", function () {
    // si client était identifié (devrait toujours être le cas)
    if (currentID !== undefined) {
      console.log("Sortie de l'utilisateur " + currentID);
      // envoi de l'information de déconnexion
      socket.broadcast.emit("message", {
        from: null,
        to: null,
        text: currentID + " a quitté la discussion",
        date: Date.now(),
      });
      // suppression de l'entrée
      remove(currentID);
      // désinscription du client
      currentID = null;
      // envoi de la nouvelle liste pour mise à jour
      socket.broadcast.emit("liste", scoresJSON());
    }
  });

  socket.on("disconnect", function () {
    // si client était identifié
    if (currentID !== undefined) {
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
      socket.broadcast.emit("liste", scoresJSON());
    }
  });

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
          io.sockets.emit("liste", scoresJSON());
        }
        break;
    }
  });
});
