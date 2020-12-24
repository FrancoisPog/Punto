"use strict";

const { log, assert, error, table } = console;

const numbers = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

document.addEventListener("DOMContentLoaded", function () {
  // Socket connection
  let sock = io.connect();

  let pseudo = null;
  let connected = false;
  let list = [];

  // DOM Elements
  let content = document.getElementById("content");
  let pseudoInput = document.getElementById("pseudo");
  let asideClients = document.querySelector("#users");
  let btnConnect = document.getElementById("btnConnecter");
  let btnLogout = document.getElementById("quitBtn");
  let chatMain = document.querySelector("#chat main");
  let messageInput = document.getElementById("monMessage");
  let btnSend = document.getElementById("btnEnvoyer");
  let btnPuntoCreate = document.getElementById("btnPuntoCreate");
  let puntoFrame = document.getElementById("frame");
  let puntoFooter = document.querySelector("#punto > footer");
  let messageWrapper = document.getElementById("textInput");
  let btnQuitGame = document.getElementById("quitGame");
  let home_radio = document.getElementById("radio_home");
  let backHome = document.getElementById("backHome");
  let popup_radio = document.getElementById("popup-cb");
  let darkmode = document.getElementById("darkmode");
  let souncCb = document.getElementById("sound-cb");

  darkmode.onclick = () => {
    document.body.classList.toggle("dark");
  };

  popup_radio.checked = false;

  // Display login screen
  document.body.classList.remove("connected");
  pseudoInput.focus();

  // *************************************************
  //                HISTORY SYSTEM
  // *************************************************

  const history = {
    commands: [],
    index: -1,
    prev: () => {
      if (history.index < history.commands.length - 1) {
        history.index++;
        return history.commands[history.index];
      }
    },
    next: () => {
      if (history.index !== -1) {
        history.index--;
        return history.commands[history.index];
      }
    },
  };

  // *************************************************
  //                  REMINDERS
  // *************************************************

  const reminders = {
    // TODO change for an array
    types: {
      1: "N'oubliez pas de jouer votre tour !",
      2: "Hé ho du bateau, qu'est ce que t'attends pour poser ta carte ?",
      3: `Bon %PLAYER_NAME% tu joues ? Tu fais chier tout le monde là...`,
      4: `Il est maintenant %HOURS%, et %PLAYER_NAME% n'a toujours pas posé sa carte...`,
      5: `Houston on a un problème, %PLAYER_NAME% ne répond plus...`,
    },
    add: (game, type = 1) => {
      if (!reminders.types[type]) {
        console.error("Reminders : Invalid type");
        return;
      }
      reminders[game] = setTimeout(() => {
        const now = new Date();

        speak(
          reminders.types[type]
            .replaceAll("%PLAYER_NAME%", pseudo)
            .replaceAll("%HOURS%", `${now.getHours()} heures et ${now.getMinutes()} minutes`)
        );
        reminders.add(game, type === Object.keys(reminders.types).length ? type : type + 1);
      }, 10000);
    },
    remove: (game) => {
      clearTimeout(reminders[game]);
    },
  };

  // *************************************************
  //                EVENT LISTENERS
  // *************************************************

  messageInput.onfocus = () => {
    messageWrapper.classList.add("focus");
  };

  messageInput.onblur = () => {
    messageWrapper.classList.remove("focus");
  };

  btnConnect.onclick = connect;

  pseudoInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      connect();
    }
  };

  btnLogout.onclick = () => {
    sock.emit("logout");
    document.body.classList.remove("connected");
  };

  for (let event of ["input", "focus", "click", "keyup"]) {
    // Active the auto-complete smiley system at every interaction with the message input, if the content isn't a command
    messageInput.addEventListener(event, function (e) {
      if (!messageInput.value.startsWith("/")) {
        SmileysSystem.listen(e, messageInput);
      }
    });
  }

  messageInput.addEventListener("keydown", function (e) {
    if (SmileysSystem.isOpen()) {
      return;
    }
    if (e.key === "Enter" && messageInput.value.trim().length !== 0) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let command = history.prev();
      if (command) {
        messageInput.value = command;
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let command = history.next();
      if (command) {
        messageInput.value = command;
      } else {
        messageInput.value = "";
      }
    }
  });

  btnSend.onclick = sendMessage;

  // *****    PUNTO       *****

  btnPuntoCreate.onclick = () => {
    sock.emit("punto", { action: "create" });
  };

  btnQuitGame.onclick = quitGame;

  backHome.onclick = () => {
    home_radio.checked = true;
  };

  // *************************************************
  //                      SOCKETS
  // *************************************************

  sock.on("erreur-connexion", function (msg) {
    if (connected) {
      return;
    }
    alert(msg);
    pseudo = null;
  });

  sock.on("bienvenue", function (clientsList) {
    connected = true;
    chatMain.innerHTML = "";
    messageWrapper.appendChild(SmileysSystem.dom);
    document.body.classList.add("connected");
    document.getElementById("radio_home").checked = true;
    document.getElementById("userPseudo").textContent = pseudo;
    updateList(clientsList);
    speak(`Bienvenue ${pseudo}, la température extérieur est de 3 degrés, bon voyage avec Pounto Airlines !`);
  });

  sock.on("liste", updateList);

  sock.on("message", function ({ from, to, text, date }) {
    // System message
    if (from == null) {
      addMessage(text, "[admin]", "system", date);
      return;
    }

    // Broadcast message
    if (to == null) {
      addMessage(text, from, from == pseudo ? "moi" : "", date);
      return;
    }

    // Personal message
    if (to === pseudo || from === pseudo) {
      addMessage(
        text.split(/^@\S+/)[1],
        `${from === pseudo ? "Vous" : from} à ${to === pseudo ? `vous` : to}`,
        "mp" + (from === pseudo ? " moi" : ""),
        date
      );
    }
  });

  sock.on("punto", handlePuntoEvent);

  // *************************************************
  //                    FUNCTIONS
  // *************************************************

  /**
   * Handler for different punto event
   */
  const PuntoHandler = Object.create(null);

  PuntoHandler.create = function (data) {
    createPuntoLobby(data.game);
    speak(`Vous venez de créer une nouvelle partie !`);
  };

  PuntoHandler.invite = function (data) {
    if (data.req.player !== pseudo) {
      // If the client isn't the one invited -> update the players list
      updatePlayersList(data.req.game, data.gameData.players);
      return;
    }
    createPuntoInvitation(data.req.from, data.req.game);
  };

  PuntoHandler.data = function (data) {
    let gameData = JSON.parse(data.content);
    let status = gameData.status;

    if (status === "pending" && gameData.players[pseudo].status === "ready") {
      // If the game is pendin -> update the players list in the lobby
      updatePlayersList(data.req.game, gameData.players);
    } else if (status === "running") {
      // If the game is running
      if (gameData.board.some((c) => c !== null)) {
        // If this is not the first turn in a round -> update the status od the players
        updatePlayersStatus(data.req.game, gameData);
      } else {
        // If it's the first turn in a round
        if (gameData.nthRound > 1) {
          // If it's not the first round
          let board = document.querySelector(`#punto .game[data-gameid="${data.req.game}"] .board`);
          // Set the current board as past
          board.classList.add("past");
          // Set the handler for click on the board -> remove it and display the new round
          board.onclick = () => {
            board.remove();
            if (gameData.currentPlayer === pseudo) {
              requestCard(data.req.game);
            }
          };

          // Create the game tab for the new round
          // TODO Insert the new tab at the same place
          deleteGameTab(data.req.game);
          createLaunchedGame(data.req.game, gameData);
          let gameFrame = document.querySelector(`#punto .game[data-gameid="${data.req.game}"]`);
          gameFrame.appendChild(board);

          return;
        } else {
          // First turn of the first round -> create the game tab
          deleteGameTab(data.req.game);
          createLaunchedGame(data.req.game, gameData);
        }
      }
      if (gameData.currentPlayer === pseudo) {
        // If the current player is the current one, request his card
        requestCard(data.req.game);
      }
    }
  };

  PuntoHandler.remove = function (data) {
    if (data.status === 1 || data.req.player === pseudo) {
      // If the user is the removed player, delete the game tab
      deleteGameTab(data.req.game);
    } else {
      // Otherwise, request new game data to update to players list
      sock.emit("punto", { action: "data", game: data.req.game });
    }
  };

  PuntoHandler.join = function (data) {
    if (data.req.player === pseudo) {
      // If the user join a game -> create the lobby element
      deleteGameTab(data.req.game);
      createPuntoLobby(data.req.game);
      speak("Vous venez de rejoindre la partie");
    } else {
      speak(`${data.req.player} vient de rejoindre la partie ! `);
    }
    // Request game data to update the players list
    sock.emit("punto", { action: "data", game: data.req.game });
  };

  PuntoHandler.launch = function (data) {
    sock.emit("punto", { action: "data", game: data.req.game });
  };

  PuntoHandler.play = function (data) {
    // Get the card element according to the game and the index

    playCardAnimation(data.req.game, data.card, data.req.index, data.req.player);

    // Update the card
    if (data.req.player === pseudo) {
      // If the user just played -> update his card
      updatePlayerCard(data.req.game);
    }

    console.log(data);

    if (data.status === 1) {
      // If the round is finished
      setTimeout(() => {
        displayPopup(
          "Terminé !",
          `${
            data.winner ? data.winner + " " : "Personne n'"
          }a gagné cette manche !<br/> Cliquer sur le plateau pour continuer`,
          "OK !"
        );
      }, 500);

      if (data.haveToNext === pseudo) {
        console.log("next");
        sock.emit("punto", { action: "next", game: data.req.game });
      }

      return;
    }

    if (data.next === pseudo) {
      // If the next player is the user -> request the card
      requestCard(data.req.game);
    }
  };

  PuntoHandler.card = function (data) {
    let card = JSON.parse(data.content);
    updatePlayerCard(data.req.game, card);
    speak("C'est à votre tour de jouer");
  };

  PuntoHandler.next = function (data) {
    console.log(data);
    if (data.status > 0) {
      // If the game is finished -> request the winner
      sock.emit("punto", { action: "winner", game: data.req.game });
      return;
    }
    // Request the new round data
    sock.emit("punto", { action: "data", game: data.req.game });
  };

  PuntoHandler.winner = function (data) {
    setTimeout(() => displayPopup(`Terminé !`, `${data.winner} gagne cette partie !`, "Terminer !"), 500);
    let board = document.querySelector(`#punto .game[data-gameid="${data.req.game}"] .board`);
    board.classList.add("past");
    board.onclick = () => {
      quitGame();
      deleteGameTab(data.req.game);
    };
  };

  /**
   * Handle punto events
   * @param {object} data
   */
  function handlePuntoEvent(data) {
    // console.dir(data);

    if (!data || ((!data.req || !data.req.action) && !data.action)) {
      console.error("[punto] - Invalid data received from server ");
      return;
    }

    // Get the action
    let action = data.action ? data.action : data.req.action;

    if (data.status < 0) {
      //console.error("Non zero status !");
      displayPopup(`Attention !`, `${data.content ? data.content : "Erreur server"}`, "Compris !");
      return;
    }

    if (PuntoHandler[action]) {
      PuntoHandler[action](data);
    } else {
      console.error(`The "${action}" action is not handled !`);
    }
  }

  /**
   * Quit the game of selected frame
   */
  function quitGame() {
    let gameTab = document.querySelector("#punto input[name='punto-frame']:checked + .game");
    if (gameTab) {
      let id = gameTab.dataset.gameid;
      sock.emit("punto", { action: "remove", game: id, player: pseudo });
    }
  }

  /**
   * Update the player card in a punto game
   * @param {number} id The game id
   * @param {{color : string, value : number}} card The new card, if no card specified, the current card is returned
   */
  function updatePlayerCard(id, card) {
    let cardElt = document.querySelector(
      `#punto .game.play[data-gameid="${id}"] > .player[data-pseudo="${pseudo}"] .card `
    );

    if (card) {
      cardElt.className = `card ${card.color} ${numbers[card.value - 1]} anim`;
      cardElt.setAttribute("data-color", card.color);
      cardElt.setAttribute("data-value", card.value);
    } else {
      cardElt.className = `card back`;
    }
  }

  /**
   * Create a new punto game tab
   * @param {number} id The game Id
   * @param {string} type The status of the game : 'launch','invite' or 'play'
   * @return {HTMLDivElement} The game tab element
   */
  function createGameTab(id, type) {
    let div = elt("div", { class: `${type} game`, "data-gameId": id });

    let input = elt("input", {
      type: "radio",
      class: "hidden",
      name: "punto-frame",
      id: "radio-game-" + id,
      checked: "true",
    });

    let label = elt("label", { for: "radio-game-" + id }, "P" + id);

    puntoFrame.appendChild(input);
    puntoFrame.appendChild(div);
    puntoFooter.appendChild(label);

    return div;
  }

  /**
   * Create a new punto lobby
   * @param {number} id The game id
   * @param {object[]} players The list of player in this game
   */
  function createPuntoLobby(id, players) {
    let div = createGameTab(id, "launch");

    // Create an empty aside
    let aside = elt("aside", {});

    // Handle clicks on players inside the aside
    aside.onclick = (e) => {
      let target = e.target;
      if (target.tagName !== "P") {
        return;
      }

      // click on pending player -> remove the invitation
      if (target.classList.contains("pending")) {
        sock.emit("punto", {
          action: "remove",
          game: id,
          player: target.textContent,
        });
        speak(`Vous venez de supprimer l'invitation pour ${target.textContent} !`);
      } else if (target.classList.contains("others")) {
        // click on a user -> invite him
        sock.emit("punto", {
          action: "invite",
          game: id,
          player: target.textContent,
          from: pseudo,
        });
        speak(`Vous venez d'envoyer une invitation à ${target.textContent} !`);
      }
    };

    // Create the section
    let section = elt(
      "section",
      {},
      elt("h2", {}, "Salle d'attente ⌛"),
      createButton("Lancer la partie !", {}, () => {
        sock.emit("punto", { action: "launch", game: id });
      }),
      elt("p", {}, "Invitez des utilisateurs et lancez la partie ! 😁")
    );

    div.appendChild(section);
    div.appendChild(aside);

    if (!players) {
      players = {};
      players[pseudo] = { status: "ready" };
    }

    // Update the aside players list
    updatePlayersList(id, players);
  }

  /**
   * Create a punto card
   * @param {string|number} type The type of the card, the value or 'none'/'back'
   * @param {string} color The card color
   * @returns {HTMLDivElement} The card element
   */
  function createCard(type, color) {
    return elt(
      "div",
      {
        class: `card ${type} ${/^(none|back)$/.test(type) ? "" : color}`,
        "data-color": color,
        "data-value": type,
      },
      elt(
        "div",
        { class: "front" },

        ...Array(9)
          .fill(null)
          .map(() => elt("div", { class: "dot" }))
      ),
      elt(
        "div",
        { class: "back" },
        elt("p", { class: "punto-logo" }, ..."punto".split("").map((l) => elt("span", {}, l)))
      )
    );
  }

  /**
   * Create a launched game
   * @param {number} id THe game id
   * @param {object} gameData The game data
   */
  function createLaunchedGame(id, gameData) {
    let div = createGameTab(id, "play");

    let players = [];
    for (let player in gameData.players) {
      players.push(player);
      // Create the player element
      let playerElt = elt(
        "div",
        {
          class: "player ",
          "data-pseudo": player,
          "data-color1": gameData.players[player].colors[0],
          "data-color2": Object.keys(gameData.players).length === 2 ? gameData.players[player].colors[1] : "",
        },
        elt("h2", {}, player),
        createCard("back")
      );
      if (player == pseudo) {
        div.insertAdjacentElement("afterbegin", playerElt);
      } else {
        div.appendChild(playerElt);
      }
    }

    // Create the board element
    let board = elt(
      "div",
      { class: "board" },
      ...gameData.board.map((c) => {
        if (c === null) {
          return createCard("none");
        }
        return createCard(c.value, c.color);
      })
    );
    // Handle the clicks on cards
    board.onclick = (e) => {
      let card = e.target;
      if (card.classList.contains("dot")) {
        card = card.parentElement.parentElement;
      } else if (card.classList.contains("front") || card.classList.contains("back")) {
        card = card.parentElement;
      }
      if (!card.classList.contains("card")) {
        return;
      }

      let index = Array.from(board.children).indexOf(card);

      reminders.remove(id);
      sock.emit("punto", { action: "play", game: id, index, player: pseudo });
    };
    div.appendChild(board);
    speak(`La partie avec ${players.filter((p) => p !== pseudo).join(", ")} vient d'être lancée`);
  }

  /**
   * Delete a game tab
   * @param {number} id The game id
   */
  function deleteGameTab(id) {
    reminders.remove(id);
    let div = document.querySelector(`#punto .game[data-gameid="${id}"]`);
    if (!div) {
      return;
    }
    div.remove();
    let radio = document.querySelector(`#punto input[id="radio-game-${id}"]`);
    // log(radio);
    radio.remove();
    let label = document.querySelector(`#punto footer label[for="radio-game-${id}"]`);
    // log(label);
    label.remove();
    home_radio.checked = true;
  }

  /**
   * Create the punto invitation screen
   * @param {string} from The player who invites
   * @param {number} id The game ID
   */
  function createPuntoInvitation(from, id) {
    let div = createGameTab(id, "join");

    let section = elt(
      "section",
      {},
      elt("h2", {}, `${from} vous invite dans une partie de Punto !`),
      (() => {
        let btn = createButton("Rejoindre !");
        btn.onclick = () => {
          sock.emit("punto", { action: "join", player: pseudo, game: id });
        };
        return btn;
      })()
    );

    div.appendChild(section);
    speak(`${from} vous invite à jouer au Pounto !`);
  }

  /**
   * Update the player list on a game lobby
   * @param {number} id The game Id
   * @param {array} players The players list
   */
  function updatePlayersList(id, players) {
    // Get the aside of the game element
    const aside = document.querySelector(`#punto .game.launch[data-gameid='${id}'] aside`);
    if (!aside) {
      return;
    }

    // Keep users who are not in the game
    let others = list.filter((p) => !Object.keys(players).includes(p));

    // Format the players objects
    players = Object.keys(players).map((p) => new Object({ name: p, status: players[p].status }));

    /// Get the ready and pending players
    let ready = players.filter((p) => p.status === "ready");
    let pending = players.filter((p) => p.status === "pending");

    // Display the new list of players
    aside.innerHTML = "";
    if (ready.length > 0) {
      aside.appendChild(elt("h4", {}, "Prêts"));
      ready.forEach((p) => {
        aside.appendChild(elt("p", { class: "ready" }, p.name));
      });
    }

    if (pending.length > 0) {
      aside.appendChild(elt("h4", {}, "Invités"));
      pending.forEach((p) => {
        aside.appendChild(elt("p", { class: "pending" }, p.name));
      });
    }

    if (others.length > 0) {
      aside.appendChild(elt("h4", {}, "Autres"));
      others.forEach((p) => {
        aside.appendChild(elt("p", { class: "others" }, p));
      });
    }
  }

  /**
   * Update the players status during a punto game (check if a player left the game)
   * @param {number} game The game ID
   * @param {object} data The game data
   */
  function updatePlayersStatus(game, data) {
    for (let p in data.players) {
      if (data.players[p].status === "left") {
        let player = document.querySelector(`#punto .game[data-gameid="${game}"] .player[data-pseudo="${p}"]`);
        if (player) {
          player.classList.add("left");
        }
      }
    }
  }

  /**
   * Create a button component
   * @param {string} text The button content
   * @param {string} attr The button attributs
   */
  function createButton(text, attr = {}, ...callbacks) {
    let btn = elt("div", { class: "button", ...attr }, elt("span", {}, text));
    callbacks.forEach((c) => {
      btn.addEventListener("click", c);
    });
    return btn;
  }

  /**
   * Display the popup with a specific content,
   * @param {string} title  The popup title
   * @param {string} text   The message content
   * @param {string} button The text on the button
   * @param {boolean} speakToo If true, the popup content will be said by the speech synthesis
   */
  function displayPopup(title, text, button, speakToo = true) {
    if (speakToo) {
      speak(`${title} ${text.replace("<br/>", "")}`);
    }
    document.getElementById("popup-title").innerHTML = title;
    document.getElementById("popup-text").innerHTML = text;
    document.getElementById("popup-btn").firstChild.innerHTML = button;
    document.getElementById("popup-cb").checked = true;
  }

  /**
   * Connect the user to the server
   */
  function connect() {
    pseudo = pseudoInput.value.trim();
    if (pseudo.length === 0) {
      alert("Votre pseudo ne doit pas être vide ! ");
      return;
    }
    if (!/^\S+$/.test(pseudo)) {
      alert("Votre pseudo ne doit pas contenir d'espaces ! ");
      return;
    }
    sock.emit("login", pseudo);
  }

  /**
   * Send a message on the chat
   */
  function sendMessage() {
    let text = messageInput.value.trim();
    if (text === "") {
      return;
    }
    messageInput.value = "";

    if (text !== history.commands[0]) {
      history.commands.unshift(text);
    }
    history.index = -1;

    let to = text.match(/^@\S+/);

    if (to) {
      to = to[0].split("@")[1];
    }
    sock.emit("message", { to: to, text: text });
  }

  /**
   * Add a message into the chat content
   * @param text The message content
   * @param from
   * @param type
   * @param date
   */
  function addMessage(text, from, type, date) {
    date = new Date(date);
    text = SmileysSystem.parse(text);
    let hours = ("0" + date.getHours()).slice(-2);
    let minutes = ("0" + date.getMinutes()).slice(-2);
    let secondes = ("0" + date.getSeconds()).slice(-2);
    let msg = elt(
      "p",
      { class: type },
      elt(
        "span",
        {
          "data-author": from === pseudo ? "Vous" : from,
          "data-hours": `${hours}:${minutes}:${secondes}`,
        },
        text
      )
    );
    chatMain.appendChild(msg);
    msg.scrollIntoView();
    if (from === pseudo) {
      speak(`Vous venez d'envoyer le message : ${text}`);
    } else if (type === "system") {
      speak(text);
    } else {
      speak(`Message de ${from} : ${text}`);
    }
  }

  /**
   * Update the connected clients list
   * It also add new players on the list on each game launch screen
   */
  function updateList(newList) {
    newList = JSON.parse(newList);
    let newUsers = newList.filter((u) => !list.includes(u));

    list = newList;

    // Update the client list
    asideClients.innerHTML = "";
    list.forEach((client) => {
      asideClients.appendChild(elt("p", {}, client));
    });

    for (let game of document.querySelectorAll(".game:not(.join)")) {
      sock.emit("punto", { action: "data", game: game.dataset.gameid });
    }
  }

  /**
   * Use the speech synthesis to say something
   * @param {*} text
   */
  function speak(text) {
    const speaker = window.speechSynthesis;
    if (!speaker || !souncCb.checked) {
      return;
    }
    speaker.speak(new SpeechSynthesisUtterance(text));
  }

  /**
   * Request the card of the current game
   * @param {number} game
   */
  function requestCard(game) {
    reminders.add(game, 1);
    sock.emit("punto", {
      action: "card",
      game: game,
      player: pseudo,
    });
  }

  async function playCardAnimation(game, card, index, player) {
    // log(player);
    let cardElt = document.querySelector(
      `#punto .game.play[data-gameid="${game}"] > .player[data-pseudo="${player}"] .card `
    );

    // log(card);

    let { top: startY, left: startX } = cardElt.getBoundingClientRect();

    let animatedCard = createCard(numbers[card.value - 1], card.color);
    animatedCard.classList.add("animate");
    animatedCard.style.top = `calc(${startY}px - 1rem)`;
    animatedCard.style.left = `calc(${startX}px - 1rem)`;
    animatedCard.style.height = cardElt.clientHeight + "px";
    animatedCard.style.width = cardElt.clientWidth + "px";
    animatedCard.setAttribute("data-color", card.color);
    animatedCard.setAttribute("data-value", card.value);

    document.body.appendChild(animatedCard);
    cardElt.className = "card back";

    let target = document.querySelector(
      `#punto .game.play[data-gameid="${game}"] > .board:not(.past) .card:nth-child(${index + 1})`
    );

    let { top: endY, left: endX } = target.getBoundingClientRect();

    animatedCard.style.top = `calc(${endY}px - 1rem)`;
    animatedCard.style.left = `calc(${endX}px - 1rem)`;
    animatedCard.style.height = target.clientHeight + "px";
    animatedCard.style.width = target.clientWidth + "px";

    setTimeout(() => {
      animatedCard.remove();
      target.className = `card ${card.color} ${numbers[card.value - 1]}`;
      target.setAttribute("data-color", card.color);
      target.setAttribute("data-value", card.value);
      // log(cardElt);
    }, 500);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
});
