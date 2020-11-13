const elements = {
  scissors: {
    paper: "cut",
    lizard: "decapitate",
  },
  paper: {
    rock: "covers",
    spock: "disproves",
  },
  rock: {
    lizard: "crushes",
    scissors: "cruches",
  },
  spock: {
    scissors: "smashes",
    rock: "vaporizes",
  },

  lizard: {
    spock: "poisons",

    paper: "eats",
  },
};

class Duel {
  constructor(player1, player2) {
    this.players = [
      {
        pseudo: player1,
        element: null,
      },
      {
        pseudo: player2,
        element: null,
      },
    ];
  }

  static create(player1, player2) {
    if (player2 === player1) {
      return -1;
    }
    return new Duel(player1, player2);
  }

  getPlayer(name) {
    let p = this.players.filter((p) => p.pseudo === name);
    return p.length === 0 ? null : p[0];
  }

  play(player, value) {
    if (player === null || value === null) {
      // null parameters
      return -1;
    }

    if (this.getPlayer(player) === null) {
      // player not exists
      return -2;
    }

    if (this.getPlayer(player).element !== null) {
      // player has aldready played
      return -3;
    }

    if (!Object.keys(elements).includes(value)) {
      // Incorrect element
      return -4;
    }

    this.getPlayer(player).element = value;

    if (this.players.filter((p) => p.pseudo !== player).element == null) {
      return 0; // Waiting for the second player
    }

    return 1; // Duel finished
  }

  get result() {
    let players = this.players;
    if (players[0].element === null || players[1].element === null) {
      return null;
    }

    for (let i of [0, 1]) {
      if (elements[players[i].element][players[(i + 1) % 2].element]) {
        return {
          winner: players[i].pseudo,
          message: `:${players[i].element}: ${
            elements[players[i].element][players[(i + 1) % 2].element]
          } :${players[(i + 1) % 2].element}:`,
        };
      }
    }

    return {
      winner: null,
      message: `:${players[1].element}: vs :${players[0].element}:`,
    };
  }
}

exports.duel = Duel;
