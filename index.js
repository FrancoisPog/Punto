// Chargement des modules
const express = require("express");
const app = express();
const server = app.listen(8080, function () {
  console.log("C'est parti ! En attente de connexion sur le port 8080...");
});

const Duel = require("./chifoumi").duel;

// Ecoute sur les websockets
const io = require("socket.io").listen(server);

// Configuration d'express pour utiliser le répertoire "public"
app.use(express.static("public"));
// set up to
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/chat.html");
});

// déblocage requetes cross-origin
io.set("origins", "*:*");

/***************************************************************
 *           Gestion des clients et des connexions
 ***************************************************************/
const clients = {}; // { id -> socket, ... }

/**
 *  Supprime les infos associées à l'utilisateur passé en paramètre.
 *  @param  {string}  id  l'identifiant de l'utilisateur à effacer
 */
function supprimer(id) {
  delete clients[id];
}

function formatList() {
  return Object.keys(clients)
    .map((c) => {
      return {
        pseudo: c,
        score: clients[c].score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Quand un client se connecte, on le note dans la console
io.on("connection", function (socket) {
  // message de debug
  console.log("Un client s'est connecté");
  let currentID = null;

  /**
   *  Doit être la première action après la connexion.
   *  @param  id  string  l'identifiant saisi par le client
   */
  socket.on("login", function (id) {
    // si le pseudo est déjà utilisé, on lui envoie l'erreur
    if (clients[id]) {
      socket.emit("erreur-connexion", "Le pseudo est déjà pris.");
      return;
    }
    // sinon on récupère son ID
    currentID = id;
    // initialisation
    clients[currentID] = {
      socket: socket,
      score: 0,
      duels: {},
    };
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

  /**
   *  Réception d'un message et transmission à tous.
   *  @param  msg     Object  le message à transférer à tous
   */
  socket.on("message", function (msg) {
    console.log("Reçu message : " + currentID);
    // si message privé, envoi seulement au destinataire
    if (msg.to != null) {
      if (clients[msg.to] !== undefined) {
        console.log(" --> message privé");
        clients[msg.to].socket.emit("message", {
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

  /**
   *  Gestion des déconnexions
   */

  // fermeture
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
      supprimer(currentID);
      // désinscription du client
      currentID = null;
      // envoi de la nouvelle liste pour mise à jour
      socket.broadcast.emit("liste", formatList());
    }
  });

  // déconnexion de la socket
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
      supprimer(currentID);
      // désinscription du client
      currentID = null;
      // envoi de la nouvelle liste pour mise à jour
      socket.broadcast.emit("liste", formatList());
    }
  });

  socket.on("chifoumi", function ({ to, element }) {
    // Incorrect user
    if (clients[to] === undefined) {
      socket.emit("chifoumi", {
        text: "Utilisateur " + to + " inconnu",
        date: Date.now(),
      });
      return;
    }

    // If no duel in progress
    if (clients[currentID].duels[to] === undefined) {
      let duel = new Duel(currentID, to);
      clients[currentID].duels[to] = duel;
      clients[to].duels[currentID] = duel;

      console.log(`Chifoumi : Duel créé entre ${currentID} et ${to}`);
      clients[to].socket.emit("chifoumi", {
        text: `${currentID} te défie au Chifoumi`,
        date: Date.now(),
        buzz: true,
      });
    }

    let duel = clients[currentID].duels[to];

    let res = duel.play(currentID, element);
    if (res === -3) {
      socket.emit("chifoumi", {
        text: `Vous avez déjà un duel en cours avec ${to}`,
        date: Date.now(),
      });
      return;
    } else if (res === -4) {
      socket.emit("chifoumi", {
        text: `Element incorrect : ${element}`,
        date: Date.now(),
      });
      return;
    }
    console.log(`Chifoumi : ${currentID} à joué ${element}`);

    if (duel.result === null) {
      socket.emit("chifoumi", {
        text: `Défi envoyé à ${to}`,
        date: Date.now(),
      });
    } else {
      let currentPlayerIsWinner = duel.result.winner === currentID;
      let exAequo = duel.result.winner == null;
      socket.emit("chifoumi", {
        text:
          duel.result.message +
          (exAequo
            ? ""
            : currentPlayerIsWinner
            ? " c'est gagné ! :grinning:"
            : " c'est perdu ! :frowning_face:"),
        date: Date.now(),
      });
      clients[to].socket.emit("chifoumi", {
        text:
          duel.result.message +
          (exAequo
            ? ""
            : !currentPlayerIsWinner
            ? " c'est gagné ! :grinning:"
            : " c'est perdu ! :frowning_face:"),
        date: Date.now(),
      });
      delete clients[currentID].duels[to];
      delete clients[to].duels[currentID];
      if (duel.result.winner) {
        clients[duel.result.winner].score++;
      }
      io.sockets.emit("liste", formatList());
    }
  });
});
