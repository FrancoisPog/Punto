"use_strict";
/********************************************************************
 *                       Punto game module
 ********************************************************************/

let players = {};
let games = {};
let static_id = 1;
/**
 *
 *  players = {
 *      fred : 1,
 *      jube : 0,
 *      ...
 *  }
 *
 *
 *  games = {
 *      34 : {
 *          _status : 'running' (or 'pending', 'break', 'finished)
 *          _current : fred,
 *          _board : [null, null, {color : red, value : 8}, null, ...],
 *          _nthRound : 1,
 *          _removedCards : [{color : blue, value : 5}]
 *          goku : {
 *                  status : 'ready',
 *                  cards : [{color : blue, value : 6}...],
 *                  victories : [1], // number of round won
 *                  colors : ['blue']
 *          }
 *          vegeta : {
 *                  status : 'ready',
 *                  cards : [{color : green, value : 4}...],
 *                  victories : [0,2],
 *                  colors : ['red']
 *          }
 *      },
 *      ...
 *  }
 *
 */

/**
 * Create a new game
 * @param {string} creator The player in charge of this game
 * @returns {number} The id of the created game
 */
export function createGame(creator) {
  let id = static_id++;
  games[id] = {
    _status: "pending",
    _board: [],
    _current: null,
    _nthRound: 1,
    _removedCards: [],
  };

  invitePlayer(id, creator);
  joinGame(id, creator);
  return id;
}

/**
 * Invite a player to a game
 * @param {number} gameId The game ID
 * @param {string} player The player (pseudo) to invite
 * @returns {number} `0` on success, `-1` if the game doesn't exist, `-2` if you invite more than 3 players, `-3` if the game is running
 */
export function invitePlayer(gameId, player) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    return -1;
  }

  if (game._status !== "pending") {
    return -3;
  }

  if (getPlayers(gameId).length === 4) {
    return -2;
  }

  if (!players[player]) {
    players[player] = 0;
  }
  if (!game[player]) {
    game[player] = {
      status: "pending",
    };
  }
  return 0;
}

/**
 * Join a game where we are invited
 * @param {number} game The game ID
 * @param {string} player The player (pseudo) who join the game
 * @returns {number}  `0` on success, `-1` if the game doesn't exist, `-2` if the player is not invited to this game, `-3` if the game is running
 */
export function joinGame(gameId, player) {
  gameId = Number(gameId);
  let game = games[gameId];

  if (!game) {
    return -1;
  }

  if (games[gameId]._status !== "pending") {
    return -3;
  }

  if (!game[player]) {
    return -2;
  } else {
    game[player].status = "ready";
    game[player].victories = [];
  }
  return 0;
}

/**
 * Remove a player from a game, all games if no game specified
 * @param {string} player The player to remove
 * @param {number} gameId The id of the game to quit
 */
export function removePlayer(player, gameId) {
  delete players[player];

  if (gameId) {
    // if game specified
    let game = games[gameId];
    if (game) {
      // if game exists
      if (game._status === "pending") {
        // if the game is pending
        delete games[gameId][player];

        if (!getPlayers(gameId).some((p) => game[p].status === "ready")) {
          delete games[gameId];
        }
      } else if (games[gameId][player]) {
        // if the game is pending and the player is participating at this game
        games[gameId][player].status = "left";
      }
    }
    return;
  }

  for (const id in games) {
    removePlayer(player, id);
  }
}

/**
 * Launch a game with all and only the ready players (who joined the game)
 * @param {number} gameId The game id
 * @return {number} `0` on success, `-1` if the game doesn't exist, `-2` if too few players are ready
 */
export function launchGame(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    // Does game exist ?
    return -1;
  }

  // Count the number of ready players
  let list = getPlayers(gameId);
  let nbReady = list.reduce((nb, curr) => {
    if (game[curr].status === "ready") {
      nb++;
    }
    return nb;
  }, 0);

  if (nbReady < 2) {
    // enough players ?
    return -2;
  }

  // Initialize game data
  game._status = "running";
  game._current = 0;
  game._board = new Array(36).fill(null);

  // Define and shuffle colors and orders
  let colors = ["blue", "red", "orange", "green"];
  let orders = [0, 1, 2, 3].slice(0, nbReady);
  shuffle(colors); // shuffle the orders
  shuffle(orders); // shuffle the colors

  for (const p of getPlayers(gameId)) {
    if (game[p].status !== "ready") {
      // is player ready ?
      delete game[p];
    } else {
      // Initialize players data
      game[p].colors = [colors.pop()];
      game[p].order = orders.pop();
      game[p].cards = [];

      if (nbReady === 2) {
        // If only 2 players, 2 colors each
        game[p].colors.push(colors.pop());
      }
    }
  }

  // Cards

  for (const p of getPlayers(gameId)) {
    // Give to players all cards of their colors
    for (let color of game[p].colors) {
      for (let i = 0; i < 18; ++i) {
        game[p].cards.push({ color: color, value: (i % 9) + 1 });
      }
    }
  }

  if (nbReady === 3) {
    // Give to each player 6 cards of the last color
    console.assert(colors.length === 1);

    let restCards = [];
    for (let i = 0; i < 18; ++i) {
      restCards.push({ color: colors[0], value: (i % 9) + 1 });
    }

    shuffle(restCards);

    for (const p of getPlayers(gameId)) {
      let order = game[p].order;
      game[p].cards.push(...restCards.slice(order * 6, order * 6 + 6));
    }
  }

  for (const p of getPlayers(gameId)) {
    shuffle(game[p].cards);
  }

  return 0;
}

/**
 * Launch a new game
 * @param {number} gameId
 * @return {number} `0` on success , `-1` if the game doesn't exist, `-2` if the game isn't pending for next round,  `1` if the game is terminate
 */
export function nextRound(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    return -1;
  }

  if (game._status !== "break") {
    return -2;
  }

  for (const p of getPlayers(gameId)) {
    if (game[p].victories.length >= 2) {
      game._status = "finished";
      return 1;
    }
  }

  game._nthRound++;
  game._current = Math.floor(Math.random() * getPlayers(gameId).length);
  game._status = "running";

  //Cards

  console.log("> Suppression des cartes correspondant à la couleur du joueur");
  for (let p of getPlayers(gameId)) {
    game[p].cards = game[p].cards.filter(
      (c) => !game[p].colors.includes(c.color)
    );
    console.log("Cartes restantes pour " + p);
    console.log(game[p].cards);
  }

  if (getPlayers(gameId).length === 3) {
    let colors = ["blue", "green", "red", "orange"];
    let restColor;
    for (const p of getPlayers(gameId)) {
      colors = colors.filter((c) => c !== game[p].colors[0]);
    }
    console.assert(colors.length === 1);
    restColor = colors[0];

    let neutralCards = [];
    let board = game._board;
    console.log("> Récupération des cartes neutres sur le plateau");
    for (let index in board) {
      if (
        board[index] &&
        board[index].color === restColor &&
        !game._removedCards.some(
          (c) =>
            c.color === board[index].color && c.value === board[index].value
        )
      ) {
        neutralCards.push(board[index]);
      }
    }
    console.log(neutralCards);
    shuffle(neutralCards);

    let toRemove = neutralCards.length % 3;
    console.log(
      "Il y a " + toRemove + " cartes neutres à défausser, cartes restantes"
    );
    while (toRemove > 0) {
      game._removedCards.push(neutralCards.pop());
      toRemove--;
    }
    console.log(neutralCards);

    shuffle(neutralCards);
    let nbNeutralsCards = neutralCards.length;
    for (const p of getPlayers(gameId)) {
      let aThird = neutralCards.slice(0, nbNeutralsCards / 3);
      console.log("Les cartes suivantes sont pour " + p);
      console.log(aThird);
      neutralCards = neutralCards.slice(nbNeutralsCards / 3);
      game[p].cards.push(...aThird);
    }
  }

  console.log("> Attribution des cartes de la couleur des joueurs");
  let removedCards = game._removedCards.slice();
  for (const p of getPlayers(gameId)) {
    for (let color of game[p].colors) {
      console.log(`Cartes ${color} pour ${p}`);
      for (let i = 0; i < 18; ++i) {
        let card = { color, value: 1 + (i % 9) };
        let index = removedCards.findIndex(
          (c) => c.color === card.color && c.value === card.value
        );
        if (index !== -1) {
          //console.log("remove!!! "+card.color+""+card.value);
          removedCards.splice(index, 1);
          continue;
        }
        process.stdout.write(`[${card.color[0]}${card.value}]`);
        game[p].cards.push(card);
      }
      console.log("");
    }
  }

  game._board = Array(36).fill(null);

  return 0;
}

/**
 * Get the JSON game data { currentPlayer : 'Zoro', nthRound : 3, boards : [...], players : {Zoro : {colors : 'red', victories : [1], status : 'ready'}}}
 * @param {} gameId
 */
export function gameData(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];

  if (!game) {
    // Does game exist ?
    return -1;
  }

  let data = {};
  if (game._status === "running") {
    data.board = game._board;
    data.nthRound = game._nthRound;
    data.removedCards = game._removedCards;
  }

  let list = Object.create(null);
  getPlayers(gameId).forEach((p) => {
    let player = game[p];
    if (player.order === game._current) {
      data.currentPlayer = p;
    }

    list[p] = {
      status: player.status,
      victories: player.victories,
      colors: player.colors,
    };
  });

  data.players = list;

  return JSON.stringify(data);
}

/**
 *
 * @param {*} gameId
 * @param {*} player
 * @param {*} index
 * @returns {number} `-1` if the game doesn't exist, `-2` if the player doesn't participate, `-3` if the card can be put here, `1` on success and if the game is finished
 */
export function play(gameId, player, index) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    // Does game exist ?
    return -1;
  }

  if (!game[player]) {
    // Does player participate to game ?
    return -2;
  }

  if (game._current !== game[player].order) {
    return -4;
  }

  if (index < 0 || index > 35) {
    // Is the position in the board ?
    return -3;
  }

  let card = game[player].cards.pop();
  let board = game._board;
  let nextCurrent = (game._current + 1) % getPlayers(gameId).length;

  if (!board.some((e) => e !== null)) {
    // Is the board empty ?
    game._board[index] = card;
    game._current = nextCurrent;
    return 0;
  }

  if (!board[index]) {
    // Is there a card at this position ?
    if (!isCardAround(gameId, index)) {
      game[player].cards.push(card);
      return -3;
    }
  } else {
    if (board[index].value >= card.value) {
      // is the new card greater than the previous ?
      return -3;
    } else {
    }
  }

  board[index] = card;

  game._current = nextCurrent;

  let results = isRoundOver(gameId);
  if (results) {
    let winner;
    getPlayers(gameId).forEach((p) => {
      if (game[p].colors.includes(results.color)) {
        game[p].victories.push(game._nthRound);
        winner = p;
      }
    });

    console.log(`> Défaussage de la carte ${results.max} ${results.color}`);
    game._removedCards.push({ value: results.max, color: results.color });
    game._status = "break";

    return { reason: results.reason, winner };
  }

  // TODO : AI if the next current are left

  return 0;
}

/**
 * Get the final winner of the game, and delete the game
 * @param {number} gameId The game Id
 * @return {number|object} An object {winner : 'Usopp'} on success,`-1` if the game doesn't exist, `-2` if the game isn't finished
 */
export function gameResult(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    return -1;
  }

  if (game._status !== "finished") {
    return -2;
  }

  let winner = getPlayers(gameId).filter(
    (p) => game[p].victories.length === 2
  )[0];

  let res = { winner };

  delete games[gameId];

  return res;
}

/**
 * Return the current card (JSON) of a player
 * @param {} gameId
 * @param {*} player
 * @returns {number} `-1` if the game doesn't exist, `-2`
 */
export function getCard(gameId, player) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    return -1;
  }

  if (!game[player]) {
    return -2;
  }

  if (game._current !== game[player].order) {
    return -4;
  }

  let cards = game[player].cards;

  if (cards.length === 0) {
    return -3;
  }

  return JSON.stringify(cards[cards.length - 1]);
}

/**
 * Get the list of games id, all or for a specified player
 * @param {string} player
 */
export function getGames(player) {
  let list = Object.keys(games);
  if (!player) {
    return list;
  }
  return list.filter((g) => {
    Object.keys(games[g]).includes(player);
  });
}

// ***** TEST FUNCTIONS *****

/**
 * @private
 * Allow to manipulate the board directly
 */
export function getBoard(gameId) {
  if (!games[gameId]) {
    return -1;
  }

  return games[gameId]._board;
}

/**
 * @private
 * @param {*} gameId
 * @param {*} player
 */
export function getAllCards(gameId, player) {
  return games[gameId][player].cards;
}

if (process.env.NODE_ENV !== "test") {
  getBoard = function () {
    throw new Error("The use of this function is reserved for tests");
  };

  getAllCards = function () {
    throw new Error("The use of this function is reserved for tests");
  };
}

// ***** INTERNAL FUNCTIONS *****

/**
 * Get the player of a given game
 * @param {number} gameId The game id
 * @return {number|array} The players list, or `-1` if the game doesn't exist
 */
function getPlayers(gameId) {
  gameId = Number(gameId);
  if (!games[gameId]) {
    return -1;
  }
  return Object.keys(games[gameId]).filter((e) => e[0] !== "_");
}

/**
 * Check if there is at least one card around a position in a board
 * @param {number} gameId The game id
 * @param {number} index The position in the board
 * @returns {number|boolean} A boolean on success, `-1` if the game doesn't exist
 */
function isCardAround(gameId, index) {
  gameId = Number(gameId);
  if (!games[gameId]) {
    return -1;
  }

  let board = games[gameId]._board;
  for (let i of [1, 5, 6, 7]) {
    if (board[index - i] || board[index + i]) {
      return true;
    }
  }
  return false;
}

/**
 * Shuffle an array
 * @param {array} array
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function isRoundOver(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];
  if (!game) {
    return -1;
  }

  if (!canPlay(game._board, getCard(gameId, getCurrentPlayer(gameId)))) {
    let visited = {};
    let count = {};
    for (let index in game._board) {
      let resBrowsing = browseColorRaw(game._board, index, visited, {});
      if (resBrowsing.rowLength >= (getPlayers(gameId).length > 2 ? 3 : 4)) {
        let color = resBrowsing.color;
        if (!count[color]) {
          count[color] = {
            count: 1,
            max: resBrowsing.max,
            sum: resBrowsing.sum,
          };
        } else {
          count[color].count++;
          count[color].max = Math.max(resBrowsing.max, count[color].max);
          count[color].sum = resBrowsing.sum;
        }
      }
    }

    let max = -1,
      color,
      maxCard,
      sum;
    for (let c in count) {
      if (count[c].count > max) {
        max = count[c].count;
        color = c;
        maxCard = count[c].max;
        sum = count[c].sum;
      } else if (count[c].count === max) {
        if (sum > count[c].sum) {
          max = count[c].count;
          color = c;
          maxCard = count[c].max;
          sum = count[c].sum;
        }
      }
    }

    return { reason: "blocked", max: maxCard, color };
  }

  let board = game._board;
  let visited = {};
  for (let index in board) {
    let resBrowsing = browseColorRaw(board, index, visited, {});
    if (resBrowsing.rowLength >= (getPlayers(gameId).length > 2 ? 4 : 5)) {
      //console.log("sum"+resBrowsing.sum+" max : "+resBrowsing.max);
      return {
        reason: "4cards",
        max: resBrowsing.max,
        color: resBrowsing.color,
      };
    }
  }
  return false;
}

/**
 *
 * @param {} board
 * @param {*} index
 * @param {*} visited
 * @param {*} param3
 */
function browseColorRaw(board, index, visited, { direction, color }) {
  index = Number(index);
  if (
    !board[index] ||
    (visited[index] && visited[index].includes(direction)) ||
    (color && board[index].color !== color)
  ) {
    return { rowLength: 0, color, sum: 0, max: 0 };
  }

  // console.log(`color : ${color}, direction : ${direction}`);

  if (!color) {
    color = board[index].color;
  }

  if (!direction) {
    direction = [1, 5, 6, 7];
  } else {
    direction = [direction];
  }

  if (!visited[index]) {
    visited[index] = direction;
  } else {
    visited[index].push(...direction);
  }

  let rowLength = 1;

  let sum = board[index].value;
  let max = sum;
  for (let i of direction) {
    let res = 1;
    let resNeg = browseColorRaw(board, index - i, visited, {
      direction: i,
      color,
    });
    let resPos = browseColorRaw(board, index + i, visited, {
      direction: i,
      color,
    });

    res += resNeg.rowLength + resPos.rowLength;

    if (res > rowLength) {
      rowLength = res;
      //console.log("res = ",resNeg.sum,"+",resPos.sum)
      max = Math.max(resNeg.max, resPos.max, max);
      sum += resNeg.sum + resPos.sum;
    }
  }

  return { rowLength, color, sum, max };
}

function canPlay(board, card) {
  let value = card.value;
  for (let i in board) {
    if (board[i] === null || board[i].value < value) {
      return true;
    }
  }
  return false;
}

function getCurrentPlayer(gameId) {
  gameId = Number(gameId);
  let game = games[gameId];
  for (const p in game) {
    if (game[p].order === game._current) {
      return p;
    }
  }
}

function playAuto(gameId, player) {}
