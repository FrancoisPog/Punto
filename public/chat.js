"use strict";

var esock;

document.addEventListener("DOMContentLoaded", function () {
  // Socket connection
  let sock = io.connect();
  esock = sock;
  let pseudo = null;

  // DOM Elements
  let content = document.getElementById("content");

  let pseudoInput = document.getElementById("pseudo");

  let asideClients = document.querySelector("#chat aside");
  let btnConnect = document.getElementById("btnConnecter");
  let btnLogout = document.getElementById("btnQuitter");
  let chatMain = document.querySelector("#chat main");
  let messageInput = document.getElementById("monMessage");
  let btnSend = document.getElementById("btnEnvoyer");

  // Display login screen
  document.body.classList.remove("connected");
  pseudoInput.focus();

  // Commands history system
  let history = {
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

  // Chifoumi autocomplete system
  let autoCompleteChifoumi = {
    elements: ["rock", "paper", "scissors", "spock", "lizard"],
    index: 0,
    next: () => {
      let res = autoCompleteChifoumi.elements[autoCompleteChifoumi.index];
      autoCompleteChifoumi.index =
        (autoCompleteChifoumi.index + 1) % autoCompleteChifoumi.elements.length;
      return res;
    },
  };

  // Chifoumi command shortcut
  //asideClients.ondblclick = chifoumiCommandShortcut;

  btnConnect.onclick = connect;

  pseudoInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      connect();
    }
  };

  // btnLogout.onclick = () => {
  //   sock.emit("logout");
  //   document.body.classList.remove("connected");
  // };

  // Active the auto-complete smiley system at every interaction with the message input, if the content isn't a command
  for (let event of ["input", "focus", "click", "keyup"]) {
    messageInput.addEventListener(event, function (e) {
      if (!messageInput.value.startsWith("/")) {
        autoCompleteSmileys(e, messageInput);
      }
    });
  }

  messageInput.addEventListener("keydown", function (e) {
    if (isOpen()) {
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
    } else if (e.which === 9) {
      e.preventDefault();
      let match = messageInput.value.match(/^\/chifoumi @[^\s]+ :/);
      if (match) {
        messageInput.value = `${match[0]}${autoCompleteChifoumi.next()}:`;
      }
    }
  });

  btnSend.onclick = sendMessage;

  // *****    SOCKECT     *****

  sock.on("erreur-connexion", function (msg) {
    alert(msg);
    pseudo = null;
  });

  sock.on("bienvenue", function (clientsList) {
    chatMain.innerHTML = "";
    chatMain.appendChild(dom);
    document.body.classList.add("connected");
    document.getElementById("login").textContent = pseudo;
    updateList(clientsList);
    if (pseudo.trim().toLowerCase() === "fred") {
      guacamole();
    }
  });

  sock.on("liste", function (clientsList) {
    updateList(clientsList);
  });

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
        `${from} [privé${from === pseudo ? ` @${to}]` : "]"}`,
        "mp",
        date
      );
    }
  });

  sock.on("chifoumi", function ({ text, date, buzz: toBuzz }) {
    addMessage(text, "[chifoumi]", "chifoumi", date);
    if (toBuzz) {
      buzz();
    }
  });

  sock.on("punto", function (res) {
    console.log(res);
  });

  // *****    FUNCTIONS     *****

  function chifoumiCommandShortcut(e) {
    if (e.target.tagName === "P" && e.target.textContent !== pseudo) {
      messageInput.value = `/chifoumi @${e.target.textContent} :`;
      messageInput.focus();
    }
  }

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

  function sendChifoumiCommand(text) {
    let match = text.match(/^\/chifoumi ([^\s]+) ([^\s]+)$/);

    if (match === null) {
      addMessage(
        "Nombre de paramètre incorrecte",
        "[chifoumi]",
        "chifoumi",
        Date.now()
      );
      return;
    }

    let opponentMatch = match[1].match(/^@([^\s]+$)/);
    if (opponentMatch === null) {
      addMessage(
        "Adversaire incorrecte ( @adversaire )",
        "[chifoumi]",
        "chifoumi",
        Date.now()
      );
      return;
    }

    let opponent = opponentMatch[1];
    if (opponent === pseudo) {
      addMessage(
        "Vous ne pouvez pas vous défier vous même",
        "[chifoumi]",
        "chifoumi",
        Date.now()
      );
      return;
    }

    let elementMatch = match[2].match(/^:(paper|rock|scissors|lizard|spock):$/);
    if (elementMatch === null) {
      addMessage("Element incorrecte", "[chifoumi]", "chifoumi", Date.now());
    }

    let element = elementMatch[1];

    sock.emit("chifoumi", {
      to: opponent,
      element: element,
    });
    return;
  }

  function sendMessage() {
    let text = messageInput.value.trim();
    messageInput.value = "";

    if (text !== history.commands[0]) {
      history.commands.unshift(text);
    }
    history.index = -1;

    if (text.startsWith("/")) {
      if (/^\/chifoumi /.test(text)) {
        sendChifoumiCommand(text);
      } else if (/^\/punto /.test(text)) {
        sendPuntoCommand(text);
      } else {
        addMessage(
          `Invalid command - "${text.match(/\/\S*/)}"`,
          "[admin]",
          "system",
          Date.now()
        );
      }
      return;
    }
    let to = text.match(/^@\S+/);

    if (to) {
      to = to[0].split("@")[1];
    }
    sock.emit("message", { to: to, text: text });
  }

  function sendPuntoCommand(text) {
    text = text.trim();
    let match = text.match(/^\/punto\s+(\S+)\s+(\S+)\s+(\S+)$/);
    console.table(match);

    // if(/^\/punto\s+create$/.test(text)){
    //   sock.emit('punto',{action : 'create'});
    //   return;
    // }

    // if(/^\/punto\s+invite\s+\S+\s+\d+$/.test(text)){
    //   let match = text.match(/\/punto\s+invite\s+(\S+)\s+(\d+)/);
    //   console.log(match[1],match[2]);
    //   sock.emit('punto',{action : 'invite', game : match[2], player : match[1]});
    //   return;
    // }

    // if(/^\/punto\s+join\s+\d+$/.test(text)){
    //   let match = text.match(/\/punto\s+join\s+(\d+)/);
    //   console.log(match[1],match[2]);
    //   sock.emit('punto',{action : 'join', game : match[1], player : pseudo});
    //   return;
    // }

    // if(/^\/punto\s+data\s+\d+$/.test(text)){
    //   let match = text.match(/\/punto\s+data\s+(\d+)/);
    //   console.log(match[1],match[2]);
    //   sock.emit('punto',{action : 'data', game : match[1]});
    //   return;
    // }
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
    text = parseSmileys(text);
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
  }

  function buzz() {
    content.classList.add("buzz");
    setTimeout(() => {
      content.classList.remove("buzz");
    }, 500);
  }

  function guacamole() {
    document.body.classList.add("guacamole");
    alert("Mode guacamole spécial M.Dadeau ! :)");
  }

  /**
   * Update the connected clients list
   */
  function updateList(list) {
    list = JSON.parse(list);

    //asideClients.innerHTML = "";
    Object.keys(list).forEach((client) => {
      // asideClients.appendChild(
      //   elt(
      //     "p",
      //     {
      //       "data-score": list[client],
      //     },
      //     client
      //   )
      // );
    });
  }
});
