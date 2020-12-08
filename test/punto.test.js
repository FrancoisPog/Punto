import { deepStrictEqual, strictEqual, notStrictEqual, match } from "assert";
import { basename } from "path";

import {
  createGame,
  gameData,
  getCard,
  invitePlayer,
  joinGame,
  launchGame,
  play,
  removePlayer,
  getBoard,
  getAllCards,
  nextRound,
  gameResult,
  getGame,
} from "../games/punto.js";

describe("Creation of a game and players management", function () {
  it("Game ids are unique", function (done) {
    notStrictEqual(createGame("Zoro"), createGame("Luffy"));
    done();
  });

  it("Created game must contains the creator", function (done) {
    let gameId = createGame("Luffy");
    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 1);
    deepStrictEqual(list.Luffy, { status: "ready", victories: [] });

    done();
  });

  it("Can invite others players", function (done) {
    let gameId = createGame("Luffy");

    strictEqual(invitePlayer(gameId, "Zoro"), 0);
    strictEqual(invitePlayer(gameId, "Nami"), 0);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 3);
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });
    deepStrictEqual(list["Zoro"], { status: "pending" });
    deepStrictEqual(list["Nami"], { status: "pending" });

    done();
  });

  it("Invite a player twice doesn't change anything", function (done) {
    let gameId = createGame("Luffy");

    strictEqual(invitePlayer(gameId, "Zoro"), 0);
    strictEqual(invitePlayer(gameId, "Chopper"), 0);
    strictEqual(invitePlayer(gameId, "Zoro"), 0);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 3);
    deepStrictEqual(list["Zoro"], { status: "pending" });
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });
    deepStrictEqual(list["Chopper"], { status: "pending" });
    done();
  });

  it("Players who joined the game are ready and other are pending", function (done) {
    let gameId = createGame("Luffy");

    strictEqual(invitePlayer(gameId, "Zoro"), 0);
    strictEqual(invitePlayer(gameId, "Nami"), 0);

    strictEqual(joinGame(gameId, "Nami"), 0);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 3);
    deepStrictEqual(list["Zoro"], { status: "pending" });
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });
    deepStrictEqual(list["Nami"], { status: "ready", victories: [] });

    done();
  });

  it("Invite a player again, after he joined doesn't change anything", function (done) {
    let gameId = createGameQuickly("Luffy", "Brook", "Sanji");

    strictEqual(joinGame(gameId, "Brook"), 0);

    strictEqual(invitePlayer(gameId, "Brook"), 0);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 3);
    deepStrictEqual(list["Brook"], { status: "ready", victories: [] });
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });
    deepStrictEqual(list["Sanji"], { status: "pending" });

    done();
  });

  it("Only invited players can join the game", function (done) {
    let gameId = createGameQuickly("Luffy", "Zoro");

    strictEqual(joinGame(gameId, "Zoro"), 0);
    strictEqual(joinGame(gameId, "Robin"), -2);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 2);
    deepStrictEqual(list["Zoro"], { status: "ready", victories: [] });
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });

    done();
  });

  it("Joining a nonexistent game fails", function (done) {
    strictEqual(joinGame(-2, "Franky"), -1);
    done();
  });

  it("Invitation to nonexistent game fails", function (done) {
    strictEqual(invitePlayer(-3, "Brook"), -1);
    strictEqual(invitePlayer(678, "Brook"), -1);
    strictEqual(invitePlayer("OnePiece", "Brook"), -1);

    done();
  });

  it("Can't invite more than 3 other players", function (done) {
    let gameId = createGame("Luffy");

    strictEqual(invitePlayer(gameId, "Zoro"), 0);
    strictEqual(invitePlayer(gameId, "Nami"), 0);
    strictEqual(invitePlayer(gameId, "Chopper"), 0);
    strictEqual(invitePlayer(gameId, "Brook"), -2);
    strictEqual(invitePlayer(gameId, "Franky"), -2);

    strictEqual(joinGame(gameId, "Zoro"), 0);
    strictEqual(joinGame(gameId, "Franky"), -2);

    let list = JSON.parse(gameData(gameId)).players;

    strictEqual(Object.keys(list).length, 4);
    deepStrictEqual(list["Luffy"], { status: "ready", victories: [] });
    deepStrictEqual(list["Zoro"], { status: "ready", victories: [] });
    deepStrictEqual(list["Nami"], { status: "pending" });
    deepStrictEqual(list["Chopper"], { status: "pending" });

    done();
  });

  it("Player can participate to several games", function (done) {
    let game1Id = createGameQuickly("Luffy", "Zoro", "Chopper");
    let game2Id = createGameQuickly("Sanji", "Franky", "Zoro");

    strictEqual(joinGame(game2Id, "Zoro"), 0);

    let list = JSON.parse(gameData(game1Id)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Zoro: { status: "pending" },
      Chopper: { status: "pending" },
    });

    list = JSON.parse(gameData(game2Id)).players;

    deepStrictEqual(list, {
      Sanji: { status: "ready", victories: [] },
      Franky: { status: "pending" },
      Zoro: { status: "ready", victories: [] },
    });

    done();
  });

  it("Remove a player", function (done) {
    let gameId = createGameQuickly("Luffy", "Zoro", "Sanji", "Chopper");

    strictEqual(joinGame(gameId, "Chopper"), 0);

    let list = JSON.parse(gameData(gameId)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Zoro: { status: "pending" },
      Sanji: { status: "pending" },
      Chopper: { status: "ready", victories: [] },
    });

    removePlayer("Zoro");

    list = JSON.parse(gameData(gameId)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Sanji: { status: "pending" },
      Chopper: { status: "ready", victories: [] },
    });

    removePlayer("Chopper");

    list = JSON.parse(gameData(gameId)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Sanji: { status: "pending" },
    });

    done();
  });

  it("Remove a player participating to several games", function (done) {
    let game1Id = createGameQuickly("Luffy", "Zoro", "Chopper");
    let game2Id = createGameQuickly("Nami", "Luffy", "Robin");

    strictEqual(joinGame(game1Id, "Chopper"), 0);

    removePlayer("Luffy");

    let list = JSON.parse(gameData(game1Id)).players;

    deepStrictEqual(list, {
      Zoro: { status: "pending" },
      Chopper: { status: "ready", victories: [] },
    });

    list = JSON.parse(gameData(game2Id)).players;

    deepStrictEqual(list, {
      Nami: { status: "ready", victories: [] },
      Robin: { status: "pending" },
    });

    done();
  });

  it("Remove a player from a specific game", function (done) {
    let gameId = createGameQuickly("Luffy", "Ace", "Brook");

    strictEqual(joinGame(gameId, "Ace"), 0);
    removePlayer("Ace", gameId);

    let list = JSON.parse(gameData(gameId)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Brook: { status: "pending" },
    });

    done();
  });

  it("Remove player from a game, while he's still participating to another", function (done) {
    let game1Id = createGameQuickly("Luffy", "Ace", "Brook");
    let game2Id = createGameQuickly("Ace", "Franky", "Sanji", "Robin");

    strictEqual(joinGame(game2Id, "Robin"), 0);

    removePlayer("Ace", game2Id);

    let list = JSON.parse(gameData(game1Id)).players;

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Brook: { status: "pending" },
      Ace: { status: "pending" },
    });

    list = JSON.parse(gameData(game2Id)).players;

    deepStrictEqual(list, {
      Franky: { status: "pending" },
      Robin: { status: "ready", victories: [] },
      Sanji: { status: "pending" },
    });

    done();
  });

  it("A game where no one is ready is deleted", function (done) {
    let gameId = createGameQuickly("Luffy", "Zoro", "Nami", "Sanji");

    strictEqual(joinGame(gameId, "Sanji"), 0);
    removePlayer("Luffy", gameId);
    removePlayer("Sanji");

    strictEqual(gameData(gameId), -1);
    strictEqual(joinGame(gameId, "Nami"), -1);

    done();
  });

  it("A removed player must be invited to join the game again", function (done) {
    let gameId = createGameQuickly("Zoro", "Luffy", "Usopp");

    strictEqual(joinGame(gameId, "Usopp"), 0);
    removePlayer("Usopp");
    strictEqual(joinGame(gameId, "Usopp"), -2);
    done();
  });

  it("No one on board anymore ?", function (done) {
    let gameId = createGameQuickly("Luffy", "Usopp", "Sanji", "Zoro");

    removePlayer("Luffy", gameId);

    strictEqual(gameData(gameId), -1);
    strictEqual(joinGame("Luffy"), -1);
    strictEqual(joinGame("Usopp"), -1);
    done();
  });
});

describe("Launch the game & players management while the game is running", function () {
  it("Launch the game with the ready players", function (done) {
    let gameId = createGameQuickly("Luffy", "Zoro", "Sanji", "Nami");

    strictEqual(joinGame(gameId, "Nami"), 0);

    strictEqual(launchGame(gameId), 0);

    let list = JSON.parse(gameData(gameId)).players;

    removeColorsFromPlayers(list);

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Nami: { status: "ready", victories: [] },
    });

    done();
  });

  it("Can't launch the game with less than 2 players", function (done) {
    let gameId = createGameQuickly("Zoro", "Robin", "Usopp");

    strictEqual(launchGame(gameId), -2);

    done();
  });

  it("Can't launch the game with less than 2 players after removing players", function (done) {
    let gameId = createGameQuickly("Zoro", "Robin", "Usopp");

    strictEqual(joinGame(gameId, "Usopp"), 0);
    strictEqual(joinGame(gameId, "Robin"), 0);

    removePlayer("Zoro");
    removePlayer("Robin");

    strictEqual(launchGame(gameId), -2);

    done();
  });

  it("Can't launch a nonexistent game", function (done) {
    strictEqual(launchGame(-3), -1);
    strictEqual(launchGame(5), -1);
    strictEqual(launchGame("mugiwara"), -1);
    done();
  });

  it("Can't invite player while the game is running", function (done) {
    let gameId = createGameQuickly("Luffy", "Ace");

    strictEqual(joinGame(gameId, "Ace"), 0);
    strictEqual(launchGame(gameId, 0), 0);

    strictEqual(invitePlayer(gameId, "Sanji"), -3);

    done();
  });

  it("Can't join a game while it's running", function (done) {
    let gameId = createGameQuickly("Luffy", "Ace", "Nami");

    strictEqual(joinGame(gameId, "Ace"), 0);
    strictEqual(launchGame(gameId, 0), 0);

    strictEqual(joinGame(gameId, "Nami"), -3);

    done();
  });

  it("Game list must contains only participating players", function (done) {
    let gameId = createGameQuickly("Luffy", "Ace", "Brook", "Chopper");

    strictEqual(joinGame(gameId, "Ace"), 0);
    strictEqual(launchGame(gameId, 0), 0);

    let list = JSON.parse(gameData(gameId)).players;

    removeColorsFromPlayers(list);

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Ace: { status: "ready", victories: [] },
    });

    done();
  });

  it("Removing player change its status", function (done) {
    let gameId = createGameQuickly("Luffy", "Ace", "Brook", "Chopper");

    strictEqual(joinGame(gameId, "Ace"), 0);
    strictEqual(joinGame(gameId, "Chopper"), 0);
    strictEqual(launchGame(gameId, 0), 0);

    removePlayer("Chopper");

    let list = JSON.parse(gameData(gameId)).players;

    removeColorsFromPlayers(list);

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Ace: { status: "ready", victories: [] },
      Chopper: { status: "left", victories: [] },
    });

    done();
  });

  it("Launched game must have a current player", function (done) {
    let gameId = launchGameQuickly(4);

    let data = JSON.parse(gameData(gameId));

    match(data.currentPlayer, /^(Zoro|Luffy|Sanji|Usopp)$/);

    done();
  });

  it("Launched game must have a number of round", function (done) {
    let gameId = launchGameQuickly(3);

    let data = JSON.parse(gameData(gameId));

    strictEqual(data.nthRound >= 0, true);

    done();
  });

  it("Board must be empty", function (done) {
    let gameId = launchGameQuickly();

    let data = JSON.parse(gameData(gameId)).board;

    deepStrictEqual(data, new Array(36).fill(null));

    done();
  });

  it("Scores must be 0", function (done) {
    let gameId = launchGameQuickly(4);

    let list = JSON.parse(gameData(gameId)).players;

    removeColorsFromPlayers(list);

    deepStrictEqual(list, {
      Luffy: { status: "ready", victories: [] },
      Sanji: { status: "ready", victories: [] },
      Zoro: { status: "ready", victories: [] },
      Usopp: { status: "ready", victories: [] },
    });
    done();
  });
});

describe("Respect for the rules of the game", function () {
  for (const NB_PLAYERS of [2, 3, 4]) {
    it(`${NB_PLAYERS} players | Good distribution of cards`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));

      // Check that all players colors are unique, and keep the last color in case of 3 players
      let colors = ["blue", "green", "orange", "red"];
      for (let player in data.players) {
        let pColors = data.players[player].colors;

        // Check the good number of colors
        if (NB_PLAYERS === 2) {
          strictEqual(pColors.length, 2);
        } else {
          strictEqual(pColors.length, 1);
        }

        // Check the uniqueness of each color
        pColors.forEach((c) => {
          strictEqual(colors.includes(c), true);
          colors = colors.filter((color) => color !== c);
        });
      }

      let lastColor = null;
      if (NB_PLAYERS === 3) {
        strictEqual(colors.length, 1);
        lastColor = colors[0];
      } else {
        strictEqual(colors.length, 0);
      }

      // Check the good number of cards of each color
      for (let player in data.players) {
        let pcolors = data.players[player].colors;
        let pCards = getAllCards(gameId, player);

        if (NB_PLAYERS === 2) {
          strictEqual(pCards.length, 36);
          strictEqual(
            pCards.filter((card) => card.color === pcolors[0]).length,
            18
          );
          strictEqual(
            pCards.filter((card) => card.color === pcolors[1]).length,
            18
          );
        } else if (NB_PLAYERS === 3) {
          strictEqual(pCards.length, 24);
          strictEqual(
            pCards.filter((card) => card.color === pcolors[0]).length,
            18
          );
          strictEqual(
            pCards.filter((card) => card.color === lastColor).length,
            6
          );
        } else {
          strictEqual(pCards.length, 18);
          strictEqual(
            pCards.filter((card) => card.color === pcolors[0]).length,
            18
          );
        }
      }

      done();
    });

    it(`${NB_PLAYERS} players | Can put a card on the empty board`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;

      let card = JSON.parse(getCard(gameId, player));

      let randomIndex = Math.floor(Math.random() * 36);

      strictEqual(play(gameId, player, randomIndex), 0);

      data = JSON.parse(gameData(gameId));

      data.board.forEach((e, i) => {
        if (i === randomIndex) {
          deepStrictEqual(e, card);
        } else {
          deepStrictEqual(e, null);
        }
      });

      done();
    });

    it(`${NB_PLAYERS} players | Can put card next to another`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;
      let firstCard = JSON.parse(getCard(gameId, player));

      strictEqual(play(gameId, player, 15), 0);

      data = JSON.parse(gameData(gameId));
      player = data.currentPlayer;
      let secondCard = JSON.parse(getCard(gameId, player));

      strictEqual(play(gameId, player, 21), 0);

      data = JSON.parse(gameData(gameId));

      data.board.forEach((e, i) => {
        if (i === 15) {
          deepStrictEqual(e, firstCard);
        } else if (i === 21) {
          deepStrictEqual(e, secondCard);
        } else {
          strictEqual(e, null);
        }
      });

      done();
    });

    it(`${NB_PLAYERS} players | Can't put a card without touch another`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;

      strictEqual(play(gameId, player, 15), 0);

      data = JSON.parse(gameData(gameId));
      player = data.currentPlayer;

      strictEqual(play(gameId, player, 23), -3);

      data = JSON.parse(gameData(gameId));
      strictEqual(data.currentPlayer, player);

      strictEqual(play(gameId, player, 8), 0);

      done();
    });

    it(`${NB_PLAYERS} players | Can cover another card if it's greater`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let board = getBoard(gameId);

      board[28] = { color: "red", value: 6 };

      let data = JSON.parse(gameData(gameId));

      getAllCards(gameId, data.currentPlayer).push({ color: "blue", value: 9 });

      strictEqual(play(gameId, data.currentPlayer, 28), 0);

      data = JSON.parse(gameData(gameId));

      deepStrictEqual(data.board[28], { color: "blue", value: 9 });

      done();
    });

    it(`${NB_PLAYERS} players | Can't cover another card if it's less`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let board = getBoard(gameId);

      board[28] = { color: "red", value: 6 };

      let data = JSON.parse(gameData(gameId));

      getAllCards(gameId, data.currentPlayer).push({ color: "blue", value: 2 });

      strictEqual(play(gameId, data.currentPlayer, 28), -3);

      data = JSON.parse(gameData(gameId));

      deepStrictEqual(data.board[28], { color: "red", value: 6 });

      done();
    });

    it(`${NB_PLAYERS} players | Can't put a card outside of the board`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;

      strictEqual(play(gameId, player, -2), -3);
      strictEqual(play(gameId, player, 36), -3);
      done();
    });

    it(`${NB_PLAYERS} players | Current player must change at every turns`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let players = [];
      let pos = [15, 20, 13, 18, 10, 6, 22, 8];
      let data, player;

      for (let i in pos) {
        data = JSON.parse(gameData(gameId));
        player = data.currentPlayer;
        if (i < NB_PLAYERS) {
          strictEqual(players.includes(player), false);
          players.push(player);
        } else {
          strictEqual(players[i % NB_PLAYERS], player);
        }

        strictEqual(play(gameId, player, pos[i]), 0);

        // printBoard(getBoard(gameId))
      }

      done();
    });

    it(`${NB_PLAYERS} players | Can't launch the next round if the current round is not finished`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));

      strictEqual(play(gameId, data.currentPlayer, 18), 0);

      strictEqual(nextRound(gameId), -2);

      data = JSON.parse(gameData(gameId));

      strictEqual(data.nthRound, 1);

      done();
    });

    it(`${NB_PLAYERS} players | A row of 4 cards of the same suit ends the round - diagonal`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      if (NB_PLAYERS === 3) {
        let gameObject = getGame(gameId);
        gameObject["Luffy"].colors = ["green"];
        gameObject["Sanji"].colors = ["blue"];
        gameObject["Zoro"].colors = ["red"];
      }

      let board = getBoard(gameId);

      board[9] = Card("red", 3);
      board[13] = Card("red", 6);
      board[14] = Card("red", 6);
      board[15] = Card("green", 8);
      board[19] = Card("red", 1);
      board[20] = Card("orange", 7);
      board[21] = Card("blue", 4);
      board[22] = Card("green", 7);
      board[26] = Card("blue", 7);
      board[27] = Card("orange", 2);
      board[28] = Card("blue", 5);
      board[29] = Card("green", 4);
      board[34] = Card("orange", 1);

      //printBoard(board);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;
      let winner = Object.keys(data.players).filter((p) =>
        data.players[p].colors.includes("red")
      )[0];

      getAllCards(gameId, player).push(Card("red", 8));

      if (NB_PLAYERS !== 2) {
        deepStrictEqual(play(gameId, player, 4), { reason: "4cards", winner });
      } else {
        strictEqual(play(gameId, player, 4), 0);

        data = JSON.parse(gameData(gameId));
        player = data.currentPlayer;
        getAllCards(gameId, player).push(Card("red", 7));
        //printBoard(board)
        deepStrictEqual(play(gameId, player, 24), { reason: "4cards", winner });
      }

      nextRound(gameId);

      data = JSON.parse(gameData(gameId));

      strictEqual(data.nthRound, 2);

      for (const p in data.players) {
        if (p === winner) {
          deepStrictEqual(data.players[p].victories, [1]);
        } else {
          deepStrictEqual(data.players[p].victories, []);
        }
      }

      done();
    });

    it(`${NB_PLAYERS} players | A row of 4 cards of the same suit ends the round - vertical`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      if (NB_PLAYERS === 3) {
        let gameObject = getGame(gameId);
        gameObject["Luffy"].colors = ["green"];
        gameObject["Sanji"].colors = ["blue"];
        gameObject["Zoro"].colors = ["red"];
      }

      let board = getBoard(gameId);
      board[14] = Card("blue", 4);
      board[15] = Card("red", 4);
      board[16] = Card("red", 5);
      board[17] = Card("orange", 4);

      board[21] = Card("green", 7);
      board[22] = Card("orange", 2);
      board[23] = Card("red", 3);
      board[26] = Card("blue", 6);
      board[27] = Card("green", 2);
      board[28] = Card("orange", 5);
      board[32] = Card("blue", 7);
      board[33] = Card("green", 6);

      //printBoard(board);

      let data = JSON.parse(gameData(gameId));
      //console.dir(data, { depth: null });
      let player = data.currentPlayer;
      let winner = Object.keys(data.players).filter((p) =>
        data.players[p].colors.includes("blue")
      )[0];
      getAllCards(gameId, player).push(Card("blue", 1));

      if (NB_PLAYERS !== 2) {
        deepStrictEqual(play(gameId, player, 20), { reason: "4cards", winner });
      } else {
        strictEqual(play(gameId, player, 20), 0);

        data = JSON.parse(gameData(gameId));
        player = data.currentPlayer;
        getAllCards(gameId, player).push(Card("blue", 7));
        deepStrictEqual(play(gameId, player, 8), { reason: "4cards", winner });
      }

      nextRound(gameId);

      data = JSON.parse(gameData(gameId));

      strictEqual(data.nthRound, 2);

      for (const p in data.players) {
        if (p === winner) {
          deepStrictEqual(data.players[p].victories, [1]);
        } else {
          deepStrictEqual(data.players[p].victories, []);
        }
      }

      done();
    });

    it(`${NB_PLAYERS} players | A row of 4 cards of the same suit ends the round - horizontal`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      if (NB_PLAYERS === 3) {
        let gameObject = getGame(gameId);
        gameObject["Luffy"].colors = ["green"];
        gameObject["Sanji"].colors = ["blue"];
        gameObject["Zoro"].colors = ["red"];
      }

      let board = getBoard(gameId);

      board[14] = Card("green", 4);
      board[15] = Card("red", 4);
      board[16] = Card("red", 5);
      board[17] = Card("orange", 4);

      board[21] = Card("green", 1);
      board[22] = Card("green", 2);
      board[23] = Card("green", 3);

      board[26] = Card("blue", 6);
      board[27] = Card("orange", 2);
      board[28] = Card("orange", 5);
      board[32] = Card("blue", 7);
      board[33] = Card("red", 6);

      // printBoard(board)

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;

      getAllCards(gameId, player).push(Card("green", 3));
      //console.log(data.players);

      let winner = Object.keys(data.players).filter((p) =>
        data.players[p].colors.includes("green")
      )[0];

      if (NB_PLAYERS !== 2) {
        deepStrictEqual(play(gameId, player, 20), { reason: "4cards", winner });
      } else {
        strictEqual(play(gameId, player, 20), 0);

        data = JSON.parse(gameData(gameId));
        player = data.currentPlayer;
        getAllCards(gameId, player).push(Card("green", 7));
        deepStrictEqual(play(gameId, player, 19), { reason: "4cards", winner });
      }

      nextRound(gameId);

      data = JSON.parse(gameData(gameId));

      strictEqual(data.nthRound, 2);

      for (const p in data.players) {
        if (p === winner) {
          deepStrictEqual(data.players[p].victories, [1]);
        } else {
          deepStrictEqual(data.players[p].victories, []);
        }
      }

      done();
    });

    it(`${NB_PLAYERS} players | Current player doesn't change after a wrong play`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let curr = data.currentPlayer;

      strictEqual(play(gameId, curr, 78), -3);

      data = JSON.parse(gameData(gameId));

      strictEqual(curr, data.currentPlayer);

      done();
    });

    it(`${NB_PLAYERS} players | A player can't play if it's not the current player`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);
      let players = ["Luffy", "Zoro", "Sanji", "Usopp"].slice(0, NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let curr = data.currentPlayer;

      players
        .filter((p) => p !== curr)
        .forEach((p) => {
          strictEqual(play(gameId, p, 15), -4);
        });

      strictEqual(play(gameId, curr, 15), 0);

      done();
    });

    it(`${NB_PLAYERS} players | A player can't get his card if it's not the current player`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);
      let players = ["Luffy", "Zoro", "Sanji", "Usopp"].slice(0, NB_PLAYERS);

      let data = JSON.parse(gameData(gameId));
      let curr = data.currentPlayer;

      players
        .filter((p) => p !== curr)
        .forEach((p) => {
          strictEqual(getCard(gameId, p), -4);
        });

      strictEqual(typeof getCard(gameId, curr), "string");

      done();
    });

    it(`${NB_PLAYERS} players | Can't play to a non exitent game`, function (done) {
      strictEqual(play(3, "Zoro", 15), -1);
      done();
    });

    it(`${NB_PLAYERS} players | Can't play without participating in the game`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);
      strictEqual(play(gameId, "Brook", 15), -2);
      done();
    });

    it(`${NB_PLAYERS} players | The round is over if the current player can't play`, function (done) {
      let gameId = launchGameQuickly(NB_PLAYERS);

      let game = getGame(gameId);
      game["Luffy"].order = 1;
      game["Zoro"].order = 2;
      game._current = 1;

      game["Luffy"].colors = NB_PLAYERS === 2 ? ["blue", "red"] : ["blue"];
      game["Zoro"].colors = NB_PLAYERS === 2 ? ["orange", "green"] : ["green"];

      if (NB_PLAYERS > 2) {
        game["Sanji"].colors = ["red"];
        if (NB_PLAYERS === 4) {
          game["Usopp"].colors = ["orange"];
        }
      }

      let board = game._board;

      let colors = ["blue", "green", "red", "orange"];
      for (let i = 0; i < 35; ++i) {
        board[i] = Card(colors[i % 4], 8);
      }

      board[0] = Card("red", 8);
      board[2] = Card("blue", 8);
      board[7] = Card("blue", 8);
      board[12] = Card("blue", 9);

      board[17] = Card("orange", 8);

      board[21] = Card("blue", 9);
      board[26] = Card("blue", 9);

      board[24] = Card("red", 8);

      if (NB_PLAYERS === 2) {
        board[5] = Card("orange", 8);
        board[31] = Card("blue", 3);
      }

      // console.table(board);

      //printBoard(board)

      let data = JSON.parse(gameData(gameId));

      game["Luffy"].cards.push(Card("orange", 8));
      game["Zoro"].cards.push(Card("blue", 4));

      // console.dir(game, { depth: null });

      deepStrictEqual(play(gameId, "Luffy", 35), {
        reason: "blocked",
        winner: "Luffy",
      });

      data = JSON.parse(gameData(gameId));

      for (const p in data.players) {
        if (p === "Luffy") {
          deepStrictEqual(data.players[p].victories, [1]);
        } else {
          deepStrictEqual(data.players[p].victories, []);
        }
      }

      nextRound(gameId);

      data = JSON.parse(gameData(gameId));

      strictEqual(data.nthRound, 2);

      done();
    });
  }

  it(`2 players | Good distribution of card after a new round`, function (done) {
    let gameId = launchGameQuickly(2);

    // Game configuration
    let game = getGame(gameId);

    game["Luffy"].colors = ["blue", "orange"];
    game["Zoro"].colors = ["red", "green"];
    game["Zoro"].cards = [];
    game["Luffy"].cards = [];
    game._current = game["Luffy"].order;

    let board = game._board;
    board[7] = Card("blue", 4);
    board[8] = Card("blue", 5);
    board[9] = Card("red", 4);
    board[10] = Card("green", 1);
    board[14] = Card("blue", 7);
    board[15] = Card("green", 7);
    board[16] = Card("red", 6);
    board[17] = Card("orange", 7);
    board[20] = Card("green", 3);
    board[21] = Card("blue", 3);
    board[22] = Card("red", 7);
    board[23] = Card("orange", 4);
    board[27] = Card("green", 7);
    board[28] = Card("blue", 5);

    let tmp = [...board.slice().filter((e) => e !== null), Card("blue", 6)];
    for (let p of ["Luffy", "Zoro"]) {
      for (let color of game[p].colors) {
        for (let i of Array(18).keys()) {
          let value = (i % 9) + 1;
          let card = Card(color, value);
          let index = tmp.findIndex(
            (c) => c.color === color && c.value === value
          );
          if (index === -1) {
            game[p].cards.push(card);
            continue;
          }
          tmp.splice(index, 1);
        }
      }
    }

    game["Luffy"].cards.push(Card("blue", 6));

    //console.dir(game, { depth: null });

    deepStrictEqual(play(gameId, "Luffy", 35), {
      reason: "4cards",
      winner: "Luffy",
    });

    strictEqual(nextRound(gameId), 0);

    strictEqual(game["Luffy"].cards.length, 35);
    strictEqual(game["Zoro"].cards.length, 36);

    for (let p of ["Luffy", "Zoro"]) {
      for (let color of game[p].colors) {
        for (let i of Array(9).keys()) {
          strictEqual(
            p === "Luffy" && color === "blue" && i + 1 === 7 ? 1 : 2,
            game[p].cards.reduce((count, card) => {
              if (card.color === color && card.value === i + 1) {
                return count + 1;
              }
              return count;
            }, 0)
          );
        }
      }
    }

    done();
  });

  it(`4 players | Good distribution of card after a new round`, function (done) {
    let gameId = launchGameQuickly(4);

    // Game configuration
    let game = getGame(gameId);

    game["Luffy"].colors = ["blue"];
    game["Zoro"].colors = ["red"];
    game["Sanji"].colors = ["green"];
    game["Usopp"].colors = ["orange"];
    game["Zoro"].cards = [];
    game["Luffy"].cards = [];
    game["Sanji"].cards = [];
    game["Usopp"].cards = [];
    game._current = game["Luffy"].order;

    let board = game._board;
    board[7] = Card("blue", 4);
    board[8] = Card("blue", 5);
    board[9] = Card("red", 4);
    board[10] = Card("green", 1);
    board[14] = Card("blue", 7);
    board[15] = Card("green", 7);
    board[16] = Card("red", 6);
    board[17] = Card("orange", 7);
    board[20] = Card("green", 3);
    board[21] = Card("blue", 3);
    board[22] = Card("red", 7);
    board[23] = Card("orange", 4);
    board[27] = Card("green", 7);

    let tmp = [...board.slice().filter((e) => e !== null), Card("blue", 6)];
    for (let p of ["Luffy", "Zoro", "Sanji", "Usopp"]) {
      for (let color of game[p].colors) {
        for (let i of Array(18).keys()) {
          let value = (i % 9) + 1;
          let card = Card(color, value);
          let index = tmp.findIndex(
            (c) => c.color === color && c.value === value
          );
          if (index === -1) {
            game[p].cards.push(card);
            continue;
          }
          tmp.splice(index, 1);
        }
      }
    }

    game["Luffy"].cards.push(Card("blue", 6));

    //console.dir(game, { depth: null });

    deepStrictEqual(play(gameId, "Luffy", 28), {
      reason: "4cards",
      winner: "Luffy",
    });

    strictEqual(nextRound(gameId), 0);

    strictEqual(game["Luffy"].cards.length, 17);
    strictEqual(game["Zoro"].cards.length, 18);
    strictEqual(game["Sanji"].cards.length, 18);
    strictEqual(game["Usopp"].cards.length, 18);

    for (let p of ["Luffy", "Zoro"]) {
      for (let color of game[p].colors) {
        for (let i of Array(9).keys()) {
          strictEqual(
            p === "Luffy" && color === "blue" && i + 1 === 7 ? 1 : 2,
            game[p].cards.reduce((count, card) => {
              if (card.color === color && card.value === i + 1) {
                return count + 1;
              }
              return count;
            }, 0)
          );
        }
      }
    }

    done();
  });

  it(`3 players | Good distribution of card after a new round`, function (done) {
    let gameId = launchGameQuickly(3);

    // Game configuration
    let game = getGame(gameId);

    game["Luffy"].colors = ["blue"];
    game["Zoro"].colors = ["red"];
    game["Sanji"].colors = ["orange"];
    game["Zoro"].cards = [];
    game["Luffy"].cards = [];
    game["Sanji"].cards = [];
    game._current = game["Luffy"].order;
    game._neutralColor = "green";

    let board = game._board;
    board[7] = Card("blue", 4);
    board[8] = Card("blue", 5);
    board[9] = Card("red", 4);
    board[10] = Card("green", 1);
    board[14] = Card("blue", 7);
    board[15] = Card("green", 7);
    board[16] = Card("red", 6);
    board[17] = Card("orange", 7);
    board[20] = Card("green", 3);
    board[21] = Card("blue", 3);
    board[22] = Card("red", 7);
    board[23] = Card("orange", 4);
    board[27] = Card("green", 7);

    let tmp = [...board.slice().filter((e) => e !== null), Card("blue", 5)];

    let greenCards = [];
    for (let i of Array(18).keys()) {
      let value = (i % 9) + 1;
      let card = Card("green", value);
      let index = tmp.findIndex(
        (c) => c.color === "green" && c.value === value
      );
      if (index === -1) {
        greenCards.push(card);
        continue;
      }
      tmp.splice(index, 1);
    }

    game["Zoro"].cards = greenCards.splice(0, 4);
    game["Luffy"].cards = greenCards.splice(0, 5);
    game["Sanji"].cards = greenCards.splice(0, 5);

    for (let p of ["Luffy", "Zoro", "Sanji"]) {
      for (let color of game[p].colors) {
        for (let i of Array(18).keys()) {
          let value = (i % 9) + 1;
          let card = Card(color, value);
          let index = tmp.findIndex(
            (c) => c.color === color && c.value === value
          );
          if (index === -1) {
            game[p].cards.push(card);
            continue;
          }
          tmp.splice(index, 1);
        }
      }
    }

    game["Luffy"].cards.push(Card("blue", 5));

    //console.dir(game, { depth: null });

    deepStrictEqual(play(gameId, "Luffy", 28), {
      reason: "4cards",
      winner: "Luffy",
    });

    strictEqual(nextRound(gameId), 0);

    strictEqual(game["Luffy"].cards.length, 23);
    strictEqual(game["Zoro"].cards.length, 23);
    strictEqual(game["Sanji"].cards.length, 24);

    for (let p of ["Luffy", "Zoro", "Sanji"]) {
      for (let color of game[p].colors) {
        for (let i of Array(9).keys()) {
          strictEqual(
            p === "Luffy" && color === "blue" && i + 1 === 7 ? 1 : 2,
            game[p].cards.reduce((count, card) => {
              if (card.color === color && card.value === i + 1) {
                return count + 1;
              }
              return count;
            }, 0)
          );
        }
      }
    }

    greenCards = [];
    for (let p of ["Luffy", "Zoro", "Sanji"]) {
      greenCards.push(...game[p].cards.filter((c) => c.color === "green"));
    }

    strictEqual(greenCards.length, 17);

    done();
  });

  it("Good distribution af cards after a new round with lost players : 3 -> 2", function (done) {
    let gameId = launchGameQuickly(3);

    // Game configuration
    let game = getGame(gameId);

    game["Luffy"].colors = ["blue"];
    game["Zoro"].colors = ["red"];
    game["Sanji"].colors = ["orange"];
    game["Zoro"].cards = [];
    game["Luffy"].cards = [];
    game["Sanji"].cards = [];
    game._current = game["Luffy"].order;
    game._removedCards.push(Card("green", 8));
    game._neutralColor = "green";

    let board = game._board;
    board[7] = Card("blue", 4);
    board[8] = Card("blue", 5);
    board[9] = Card("red", 4);
    board[10] = Card("green", 1);
    board[14] = Card("blue", 7);
    board[15] = Card("green", 7);
    board[16] = Card("red", 6);
    board[17] = Card("orange", 7);
    board[20] = Card("green", 3);
    board[21] = Card("blue", 3);
    board[22] = Card("red", 7);
    board[23] = Card("orange", 4);
    board[27] = Card("green", 7);

    let tmp = [
      ...board.slice().filter((e) => e !== null),
      Card("blue", 5),
      Card("green", 8),
    ];

    let greenCards = [];
    for (let i of Array(18).keys()) {
      let value = (i % 9) + 1;
      let card = Card("green", value);
      let index = tmp.findIndex(
        (c) => c.color === "green" && c.value === value
      );
      if (index === -1) {
        greenCards.push(card);
        continue;
      }
      tmp.splice(index, 1);
    }

    game["Zoro"].cards = greenCards.splice(0, 4);
    game["Luffy"].cards = greenCards.splice(0, 5);
    game["Sanji"].cards = greenCards.splice(0, 5);

    for (let p of ["Luffy", "Zoro", "Sanji"]) {
      for (let color of game[p].colors) {
        for (let i of Array(18).keys()) {
          let value = (i % 9) + 1;
          let card = Card(color, value);
          let index = tmp.findIndex(
            (c) => c.color === color && c.value === value
          );
          if (index === -1) {
            game[p].cards.push(card);
            continue;
          }
          tmp.splice(index, 1);
        }
      }
    }

    game["Luffy"].cards.push(Card("blue", 5));

    //console.dir(game, { depth: null });

    deepStrictEqual(play(gameId, "Luffy", 28), {
      reason: "4cards",
      winner: "Luffy",
    });

    removePlayer("Zoro", gameId);

    console.dir(game, { depth: null });

    strictEqual(0, nextRound(gameId));

    console.dir(game, { depth: null });

    strictEqual(game["Luffy"].colors.length, 2);
    strictEqual(game["Sanji"].colors.length, 2);

    strictEqual(game["Luffy"].colors.includes("blue"), true);
    strictEqual(game["Sanji"].colors.includes("orange"), true);

    strictEqual(
      false,
      game._removedCards.some((c) => c.color === "red" || c.color === "green")
    );

    strictEqual(game["Luffy"].cards.length, 35);
    strictEqual(game["Sanji"].cards.length, 36);

    for (let p of ["Luffy", "Sanji"]) {
      for (let color of game[p].colors) {
        for (let i of Array(9).keys()) {
          strictEqual(
            p === "Luffy" && color === "blue" && i + 1 === 7 ? 1 : 2,
            game[p].cards.reduce((count, card) => {
              if (card.color === color && card.value === i + 1) {
                return count + 1;
              }
              return count;
            }, 0)
          );
        }
      }
    }

    //strictEqual(0, 1);

    done();
  });

  it("Good distribution af cards after a new round with lost players : 4 -> 2", function (done) {
    let gameId = launchGameQuickly(4);

    // Game configuration
    let game = getGame(gameId);

    game["Luffy"].colors = ["blue"];
    game["Zoro"].colors = ["red"];
    game["Sanji"].colors = ["orange"];
    game["Usopp"].colors = ["green"];
    game["Zoro"].cards = [];
    game["Luffy"].cards = [];
    game["Sanji"].cards = [];
    game["Usopp"].cards = [];
    game._current = game["Luffy"].order;
    game._removedCards.push(Card("green", 8));
    game._removedCards.push(Card("red", 2));

    let board = game._board;
    board[7] = Card("blue", 4);
    board[8] = Card("blue", 5);
    board[9] = Card("red", 4);
    board[10] = Card("green", 1);
    board[14] = Card("blue", 7);
    board[15] = Card("green", 7);
    board[16] = Card("red", 6);
    board[17] = Card("orange", 7);
    board[20] = Card("green", 3);
    board[21] = Card("blue", 3);
    board[22] = Card("red", 7);
    board[23] = Card("orange", 4);
    board[27] = Card("green", 7);

    let tmp = [
      ...board.slice().filter((e) => e !== null),
      Card("blue", 5),
      Card("green", 8),
      Card("red", 2),
    ];

    for (let p of ["Luffy", "Zoro", "Sanji", "Usopp"]) {
      for (let color of game[p].colors) {
        for (let i of Array(18).keys()) {
          let value = (i % 9) + 1;
          let card = Card(color, value);
          let index = tmp.findIndex(
            (c) => c.color === color && c.value === value
          );
          if (index === -1) {
            game[p].cards.push(card);
            continue;
          }
          tmp.splice(index, 1);
        }
      }
    }

    game["Luffy"].cards.push(Card("blue", 5));

    //console.dir(game, { depth: null });

    deepStrictEqual(play(gameId, "Luffy", 28), {
      reason: "4cards",
      winner: "Luffy",
    });

    removePlayer("Zoro", gameId);
    removePlayer("Luffy", gameId);

    console.dir(game, { depth: null });

    strictEqual(0, nextRound(gameId));

    console.dir(game, { depth: null });

    strictEqual(game["Usopp"].colors.length, 2);
    strictEqual(game["Sanji"].colors.length, 2);

    strictEqual(game["Usopp"].colors.includes("green"), true);
    strictEqual(game["Sanji"].colors.includes("orange"), true);

    strictEqual(
      false,
      game._removedCards.some((c) => c.color === "red" || c.color === "blue")
    );

    strictEqual(game["Usopp"].cards.length, 35);
    strictEqual(game["Sanji"].cards.length, 36);

    for (let p of ["Usopp", "Sanji"]) {
      for (let color of game[p].colors) {
        for (let i of Array(9).keys()) {
          strictEqual(
            p === "Usopp" && color === "green" && i + 1 === 8 ? 1 : 2,
            game[p].cards.reduce((count, card) => {
              if (card.color === color && card.value === i + 1) {
                return count + 1;
              }
              return count;
            }, 0)
          );
        }
      }
    }

    done();
  });
});

describe("Game result", function () {
  it("Can't get the game result before the game is finished", function (done) {
    let gameId = launchGameQuickly(4);

    strictEqual(gameResult(gameId), -2);

    done();
  });

  it("Return the good winner", function (done) {
    let gameId = launchGameQuickly(4);

    do {
      let board = getBoard(gameId);

      board[9] = Card("red", 3);
      board[13] = Card("red", 6);
      board[14] = Card("red", 6);
      board[15] = Card("green", 8);
      board[19] = Card("red", 1);
      board[20] = Card("orange", 7);
      board[21] = Card("blue", 4);
      board[22] = Card("green", 7);
      board[26] = Card("blue", 7);
      board[27] = Card("orange", 2);
      board[28] = Card("blue", 5);
      board[29] = Card("green", 4);
      board[34] = Card("orange", 1);

      let data = JSON.parse(gameData(gameId));
      let player = data.currentPlayer;
      var winner = Object.keys(data.players).filter((p) =>
        data.players[p].colors.includes("red")
      )[0];

      getAllCards(gameId, player).push(Card("red", 8));

      deepStrictEqual(play(gameId, player, 4), { reason: "4cards", winner });

      strictEqual(gameResult(gameId), -2);
    } while (nextRound(gameId) === 0);

    let res = gameResult(gameId);

    strictEqual(res.winner, winner);

    done();
  });
});

// ***** FUNCTIONS *****

/**
 * Remove colors property in a list of players. Useful for first tests when the colors of players doesn't matter
 * @param {*} list
 */
function removeColorsFromPlayers(list) {
  for (let p in list) {
    delete list[p].colors;
  }
}

/**
 * Create & launch a game quickly
 * "Luffy","Zoro","Sanji","Usopp"
 * @param {number} nbPlayers
 */
function launchGameQuickly(nbPlayers = 4) {
  let players = ["Luffy", "Zoro", "Sanji", "Usopp"].slice(0, nbPlayers);
  let gameId = createGameQuickly("Luffy", "Zoro", "Sanji", "Usopp");

  for (let player of players) {
    strictEqual(joinGame(gameId, player), 0);
  }

  strictEqual(launchGame(gameId), 0);

  return gameId;
}

/**
 * Create a card
 * @param {string} color
 * @param {number} value
 */
function Card(color, value) {
  return { color: color, value: value };
}

/**
 * Print a board
 * @param {array} board
 */
function printBoard(board) {
  for (let i in board) {
    if (i % 6 === 0 && i !== 0) {
      process.stdout.write("\n");
    }
    if (board[i]) {
      process.stdout.write(`| ${board[i].color[0]} |`);
    } else {
      process.stdout.write(`|   |`);
    }
  }
  console.log("");
}

/**
 * Create a game quickly
 * @param {string} creator
 * @param  {...string} players
 */
function createGameQuickly(creator, ...players) {
  let gameId = createGame(creator);

  for (let player of players) {
    strictEqual(invitePlayer(gameId, player), 0);
  }

  return gameId;
}
