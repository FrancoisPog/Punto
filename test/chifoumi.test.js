const assert = require("assert");
const chifoumi = require("../chifoumi");
const { it, describe, beforeEach } = require("mocha");

const Duel = chifoumi.duel;

describe("Chifoumi", function () {
  let duel;
  beforeEach("Create a new duel", function () {
    duel = new Duel("François", "Fanny");
  });

  describe("Result", function () {
    it("No winner", function () {
      assert(duel.result === null);
    });

    it("Good result", function () {
      duel.play("François", "lizard");
      duel.play("Fanny", "scissors");

      assert.deepStrictEqual(duel.result, {
        winner: "Fanny",
        message: ":scissors: decapitate :lizard:",
      });
    });

    it("Ex-aequo", function () {
      duel.play("François", "paper");
      duel.play("Fanny", "paper");

      assert.deepStrictEqual(duel.result, {
        winner: null,
        message: ":paper: vs :paper:",
      });
    });
  });

  describe("Get Player", function () {
    it("Good name", function () {
      assert.notStrictEqual(duel.getPlayer("François"), null);
      assert.notStrictEqual(duel.getPlayer("Fanny"), null);
    });

    it("Bad name", function () {
      assert.strictEqual(duel.getPlayer("Francois"), null);
      assert.strictEqual(duel.getPlayer("Phanni"), null);
    });
  });

  describe("Play", function () {
    it("Bad element", function () {
      assert.strictEqual(duel.play("François", "fire"), -4);
    });

    it("Bad player", function () {
      assert.strictEqual(duel.play("Fraçois", "rock"), -2000);
    });

    it("Null parameters", function () {
      assert.strictEqual(duel.play(null, "lizard"), -1);
      assert.strictEqual(duel.play("François", null), -1);
    });

    it("Already played", function () {
      assert.strictEqual(duel.play("Fanny", "spock"), 0);
      assert.strictEqual(duel.play("Fanny", "paper"), -3);
    });
  });
});
