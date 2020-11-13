"use strict";

document.addEventListener("DOMContentLoaded", function (_e) {
  // Socket connection
  let sock = io.connect();
  let pseudo = null;

  // DOM Elements
  let content = document.getElementById("content");
  let radLogScreen = document.getElementById("radio1");
  let pseudoInput = document.getElementById("pseudo");
  let radContentScreen = document.getElementById("radio2");
  let asideClients = document.querySelector("#content aside");
  let btnConnect = document.getElementById("btnConnecter");
  let btnLogout = document.getElementById("btnQuitter");
  let chatMain = document.querySelector("#content main");
  let messageInput = document.getElementById("monMessage");
  let btnSend = document.getElementById("btnEnvoyer");

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

  // *****    LISTENERS     *****

  asideClients.ondblclick = (e) => {
    if (e.target.tagName === "P" && e.target.textContent !== pseudo) {
      messageInput.value = `/chifoumi @${e.target.textContent} :`;
      messageInput.focus();
    }
  };

  // Display login screen
  radLogScreen.checked = true;
  pseudoInput.focus();

  btnConnect.onclick = () => {
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
  };

  pseudoInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      btnConnect.click();
    }
  };

  btnLogout.onclick = () => {
    sock.emit("logout");
    radLogScreen.checked = true;
  };

  messageInput.addEventListener("input", function (e) {
    if (messageInput.value.startsWith("/")) {
      AutoCompleteSmileys.setPause(true);
    } else {
      AutoCompleteSmileys.setPause(false);
    }
  });

  messageInput.onclick = () => {
    messageInput.dispatchEvent(new InputEvent("input"));
  };

  messageInput.addEventListener("keydown", function (e) {
    if (AutoCompleteSmileys.isOpen()) {
      return;
    }
    if (e.key === "Enter" && messageInput.value.trim().length !== 0) {
      e.preventDefault();
      btnSend.click();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let command = history.prev();
      if (command) {
        messageInput.value = command;
        messageInput.dispatchEvent(new InputEvent("input"));
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let command = history.next();
      if (command) {
        messageInput.value = command;
        messageInput.dispatchEvent(new InputEvent("input"));
      } else {
        messageInput.value = "";
      }
    } else if (e.which === 9) {
      e.preventDefault();
      let match = messageInput.value.match(/^\/chifoumi @[^\s]+ :/);
      if (match) {
        messageInput.dispatchEvent(new InputEvent("input"));
        messageInput.value = `${match[0]}${autoCompleteChifoumi.next()}:`;
      }
    }
  });

  btnSend.onclick = () => {
    let text = messageInput.value.trim();
    messageInput.value = "";

    if (text !== history.commands[0]) {
      history.commands.unshift(text);
    }
    history.index = -1;

    if (text.startsWith("/")) {
      if (/^\/chifoumi /.test(text)) {
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

        let elementMatch = match[2].match(
          /^:(paper|rock|scissors|lizard|spock):$/
        );
        if (elementMatch === null) {
          addMessage(
            "Element incorrecte",
            "[chifoumi]",
            "chifoumi",
            Date.now()
          );
          return;
        }

        let element = elementMatch[1];

        sock.emit("chifoumi", {
          to: opponent,
          element: element,
        });
        return;
      } else {
        addMessage(
          `Invalid command - "${text.match(/\/\S*/)}"`,
          "[admin]",
          "system",
          Date.now()
        );
        return;
      }
    }
    let to = text.match(/^@\S+/);

    if (to) {
      to = to[0].split("@")[1];
    }
    sock.emit("message", { to: to, text: text });
  };

  // *****    SOCKECT     *****

  sock.on("erreur-connexion", function (msg) {
    alert(msg);
    pseudo = null;
  });

  sock.on("bienvenue", function (clientsList) {
    chatMain.innerHTML = "";
    chatMain.appendChild(AutoCompleteSmileys.dom);
    radContentScreen.checked = true;
    document.getElementById("login").textContent = pseudo;
    updateList();
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

  AutoCompleteSmileys.create(messageInput, elt("div", { id: "autocomplete" }));

  // *****    FUNCTIONS     *****

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
      `${hours}:${minutes}:${secondes} - ${from} : ${text}`
    );
    chatMain.appendChild(msg);
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
    //list = JSON.parse(list)
    console.log(list);
    asideClients.innerHTML = "";
    Object.keys(list).forEach((client) => {
      asideClients.appendChild(
        elt(
          "p",
          {
            "data-score": list[client],
          },
          client
        )
      );
    });
  }
});
