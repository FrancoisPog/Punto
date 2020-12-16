const { Builder, By, Key } = require("selenium-webdriver");

async function test() {
  // INIT
  const francois = await createDriver();
  await francois.manage().window().maximize();

  await francois.get("localhost:8080");

  await newTab(francois); // 1

  await login(francois, "Franc<ss<<çois");

  await francois.sleep(1000);

  await switchTab(francois, 0);

  await login(francois, "Simon<<<<<Luc");

  let fanny = await newWindowDriver(francois);

  await login(fanny, "Fannnny");

  // // CHAT + SMILEYS

  // await francois.sleep(1000);

  // await SendMessage(fanny, "Salut tout le monde !$");

  // await francois.sleep(1000);

  // await SendMessage(francois, "Salut ! :smiley<^^|$ $", 50);

  // await francois.sleep(1000);

  // await switchTab(francois, 1);

  // await SendMessage(francois, "T'es qui ? :woozy<<<<<think$ $", 40);

  // await francois.sleep(1000);

  // await simulateEventStart(francois, "html body.connected div#chat main p.moi", "hover");

  // await francois.sleep(3000);

  // // MESSAGE HOUR

  // await simulateEventStop(francois, "html body.connected div#chat main p.moi", "hover");

  // await simulateEventStart(francois, "html body.connected div#chat main p:nth-of-type(4)", "hover");

  // await francois.sleep(2000);

  // await simulateEventStop(francois, "html body.connected div#chat main p:nth-of-type(4)", "hover");

  // await francois.sleep(1000);

  // // MP

  // await SendMessage(fanny, "@François J'ai un secret pour toi !$");

  // await francois.sleep(3000);

  // await switchTab(francois, 0);

  // // SOUND

  // await francois.sleep(2000);

  // await toggleMenuOption(francois, 4);

  // await SendMessage(francois, "Vous m'entendez ? :ear:$");

  // await francois.sleep(4000);

  // await SendMessage(fanny, "oh que oui ... :disapp$ $");

  // await francois.sleep(2000);

  // await toggleMenuOption(francois, 4);

  // // USERS LIST

  // await simulateEventStart(francois, "html body.connected div#chat footer label:first-child", "hover");

  // await francois.sleep(3000);

  // await clickOn(francois, "/html/body/div[2]/footer/label");

  // await francois.sleep(4000);

  // await clickOn(francois, "/html/body/div[2]/footer/label");

  // await francois.sleep(2000);

  // await simulateEventStop(francois, "html body.connected div#chat footer label:first-child", "hover");

  // FULL SCREEN PRESENTATION

  await francois.manage().window().maximize();
  await fanny.manage().window().setPosition(4000, 0);

  await toggleMenuOption(francois, 3);

  francois.sleep(1000);

  await toggleMenuOption(francois, 3);
  await toggleMenuOption(francois, 2);

  await createGame(francois);

  await francois.sleep(1000);

  await invitePlayer(francois, 2);

  await francois.sleep(1000);

  await invitePlayer(francois, 3);

  await switchTab(francois, 1);

  await francois.sleep(1000);

  await joinGame(francois);

  await toggleMenuOption(francois, 2);

  await toggleMenuOption(fanny, 2);

  let { width, height } = await francois.manage().window().getSize();
  await fanny
    .manage()
    .window()
    .setPosition(width / 2, 0);

  await fanny.sleep(1000);

  await joinGame(fanny);

  await francois.sleep(1000);

  await francois
    .manage()
    .window()
    .setSize(width / 2, height);
  await francois.manage().window().setPosition(0, 0);

  await francois.sleep(1000);

  await launchGame(francois);

  await playGame3(francois, fanny);

  // francois.close();
  // fanny.close();
}

test();

// ************************************************
//                    FUNCTIONS
// ************************************************

async function launchGame(driver) {
  await simulateEventStart(driver, `html body.connected div#punto div#frame div.launch.game section .button`, "active");

  await driver.sleep(500);

  await clickOn(driver, `/html/body/div[3]/div[2]/div[6]/section/div`);

  await driver.sleep(1000);
}

async function joinGame(driver) {
  await simulateEventStart(driver, `html body.connected div#punto div#frame div.join.game .button`, "active");

  await driver.sleep(500);

  await clickOn(driver, `/html/body/div[3]/div[2]/div[6]/section/div`);

  await driver.sleep(1000);
}

async function invitePlayer(driver, playerIndex) {
  await simulateEventStart(
    driver,
    `html body.connected div#punto div#frame div.launch.game aside p:nth-of-type(${playerIndex})`,
    "hover"
  );

  await driver.sleep(1000);

  await clickOn(driver, `/html/body/div[3]/div[2]/div[6]/aside/p[${playerIndex}]`);

  await simulateEventStop(
    driver,
    `html body.connected div#punto div#frame div.launch.game aside p:nth-of-type(${playerIndex})`,
    "hover"
  );

  await driver.sleep(1000);
}

async function toggleMenuOption(driver, option) {
  await simulateEventStart(driver, `html body.connected aside#menu label:nth-of-type(${option})`, "hover");

  await driver.sleep(2000);

  await clickOn(driver, `/html/body/aside/label[${option}]`);

  await driver.sleep(500);

  await clickOn(driver, "/html/body");

  await driver.sleep(1000);

  await simulateEventStop(driver, `html body.connected aside#menu label:nth-of-type(${option})`, "hover");
}

async function newWindowDriver(driver) {
  const { height, width } = await driver.manage().window().getSize();
  await driver
    .manage()
    .window()
    .setSize(width / 2, height);
  await driver.manage().window().setPosition(0, 0);

  await driver.sleep(1000);

  const res = await createDriver();

  await res
    .manage()
    .window()
    .setSize(width / 2, height);

  await res
    .manage()
    .window()
    .setPosition(width / 2, 0);

  await res.get("http://localhost:8080");

  return res;
}

async function playGame3(left, right) {
  let currentDriver = left;
  let currentTab = 0;
  let currentGame = 1;
  let hasLeft = 0;

  while (true) {
    try {
      let board = await currentDriver.findElement(By.css(".board.past"));
      await currentDriver.sleep(1000);

      await clickOn(left, '//*[@id="popup-btn"]');
      await left.sleep(2000);
      board = await left.findElement(By.css(".board.past"));
      board.click();

      await switchTab(left, (currentTab + 1) % 2);

      await clickOn(left, '//*[@id="popup-btn"]');
      await left.sleep(2000);
      board = await left.findElement(By.css(".board.past"));
      board.click();

      await clickOn(right, '//*[@id="popup-btn"]');
      await right.sleep(2000);
      board = await right.findElement(By.css(".board.past"));
      board.click();

      try {
        await left.findElement(By.css("input#radio_home:checked"));
        break;
      } catch (e) {
        currentGame++;
        continue;
      }
    } catch (e) {
      let card = await currentDriver.findElement(By.xpath("/html/body/div[3]/div[2]/div[6]/div[1]/div"));
      while ((await card.getAttribute("class")).match("back")) {
        if (currentDriver === left && currentTab === 0 && !hasLeft) {
          currentTab = 1;
          switchTab(left, 1);
        } else if (currentDriver === left && (hasLeft || currentTab === 1)) {
          currentDriver = right;
        } else {
          currentDriver = left;
          currentTab = 0;
          switchTab(left, 0);
        }
        card = await currentDriver.findElement(By.xpath("/html/body/div[3]/div[2]/div[6]/div[1]/div"));
      }

      if (currentDriver === left && currentTab === 1 && currentGame == 2 && Math.random() > 0.8) {
        clickOn(currentDriver, "//*[@id='quitGame']");
        hasLeft = true;
        currentTab = 0;
      } else {
        await play(
          currentDriver,
          "/html/body/div[3]/div[2]/div[6]/div[1]/div",
          "/html/body/div[3]/div[2]/div[6]/div[4]"
        );
      }
      await left.sleep(1000);
    }
  }
}

async function simulateEventStart(driver, css, event) {
  await driver.executeScript(`document.querySelector('${css}').classList.add('${event}')`);
}

async function simulateEventStop(driver, css, event) {
  await driver.executeScript(`document.querySelector('${css}').classList.remove('${event}')`);
}

async function createDriver() {
  return await new Builder().forBrowser("firefox").build();
}

async function clickOn(driver, xpath) {
  const e = await driver.findElement(By.xpath(xpath));
  e.click();
}

async function createGame(driver) {
  const btn = await driver.findElement(By.id("btnPuntoCreate"));
  btn.click();
  await driver.sleep(1000);
}

async function newTab(driver) {
  const tabs = await driver.getAllWindowHandles();
  // console.log(tabs);
  await driver.executeScript("window.open('http://localhost:8080')");
  await driver.sleep(1000);

  frame = await driver.getAllWindowHandles();
  frame = frame[tabs.length];
  //console.log(frame);

  await driver.sleep(1000);

  await driver.switchTo().window(String(frame));
}

async function switchTab(driver, number) {
  const tabs = await driver.getAllWindowHandles();
  const tab = tabs[number];
  await driver.switchTo().window(String(tab));
}

async function login(driver, pseudo) {
  const btnlogin_fr = await driver.findElement(By.id("btnConnecter"));
  const inputPseudo_fr = await driver.findElement(By.id("pseudo"));
  await driver.sleep(500);

  await type(inputPseudo_fr, pseudo);
  await driver.sleep(500);

  await btnlogin_fr.click();
}

async function SendMessage(driver, text, timing) {
  let elt = await driver.findElement(By.id("monMessage"));

  await type(elt, text, timing);
}

function type(elt, text, timing = 100) {
  return new Promise((resolve) => {
    text = text.split("");
    let int = setInterval(async () => {
      let symbol = text.shift();

      switch (symbol) {
        case "<": {
          symbol = Key.BACK_SPACE;
          break;
        }
        case "$": {
          symbol = Key.ENTER;
          break;
        }
        case "^": {
          symbol = Key.ARROW_UP;
          break;
        }
        case "|": {
          symbol = Key.ARROW_DOWN;
          break;
        }
      }

      await elt.sendKeys(symbol);
      if (text.length === 0) {
        clearInterval(int);
        resolve();
      }
    }, timing);
  });
}

async function play(driver, cardXPath, boardXPath) {
  card = await driver.findElement(By.xpath(cardXPath));
  card = await htmlCardToCard(card);

  let board = await htmlBoardToBoard(driver, boardXPath);

  let index = playAI(board, card);
  // console.log("index choisi :" + index);

  await clickOn(driver, `${boardXPath}/div[${index}]`);
}

async function htmlBoardToBoard(driver, boardxpath) {
  let board = [];

  for (const i of Array(36).keys()) {
    const card = await driver.findElement(By.xpath(`${boardxpath}/div[${i + 1}]`));
    board.push(await htmlCardToCard(card));
  }

  return board;
}

async function htmlCardToCard(e) {
  if ((await e.getAttribute("data-color")) == "undefined") {
    return null;
  }
  return {
    color: await e.getAttribute("data-color"),
    value: await e.getAttribute("data-value"),
  };
}

// AI

function playAI(board, card) {
  const pb = [];
  if (!board.some((c) => c !== null)) {
    return Math.floor(1 + Math.random() * 35);
  }
  for (let i in board) {
    if (board[i] === null || board[i].value < card.value) {
      if (isCardAround(board, i)) {
        for (let j in Array(1).fill(null)) {
          pb.push(i);
        }
        if (isCardAround(board, i, card.color)) {
          for (let j in Array(10).fill(null)) {
            pb.push(i);
          }
        }
        // console.log(morethanTwo(board, i, card.color, 0, null));
        if (morethanTwo(board, i, card.color, 0, null)) {
          for (let j in Array(10000).fill(null)) {
            pb.push(i);
          }
        }
      }
    }
  }
  // console.log("Possibilité", pb);
  return Number(pb[Math.floor(Math.random() * pb.length)]) + 1;
}

function isCardAround(board, index, color) {
  // console.table(board);

  index = Number(index);
  for (let i of [1, 5, 6, 7]) {
    if (!(((i === 7 || i === 1) && index % 6 === 0) || (i === 5 && (index + 1) % 6 === 0))) {
      if (
        index - i >= 0 &&
        ((color && board[index - i] && board[index - i].color === color) || (!color && board[index - i]))
      ) {
        // console.log("ica : " + index + String(-i));
        return true;
      }
    }
    if (!((i === 5 && index % 6 === 0) || ((i === 7 || i === 1) && (index + 1) % 6 === 0))) {
      if (
        index + i <= 35 &&
        ((color && board[index + i] && board[index + i].color === color) || (!color && board[index + i]))
      ) {
        // console.log("ica : " + index + String(i));
        return true;
      }
    }
  }
  return false;
}

function morethanTwo(board, index, color, step = 0, direction) {
  index = Number(index);
  if (index < 0 || index > 35) {
    return false;
  }
  // console.log("mt2", index, color, step, direction);
  if (step) {
    if (!board[index] || board[index].color !== color) {
      return false;
    } else if (step === 2) {
      // console.log("moreThan2 : success !");
      return true;
    }
  }

  if (direction) {
    // console.log(direction);
    if (
      ((direction === -7 || direction === -1) && index % 6 === 0) ||
      (direction === -5 && (index + 1) % 6 === 0) ||
      (direction === 5 && index % 6 === 0) ||
      ((direction === 7 || direction === 1) && (index + 1) % 6 === 0)
    ) {
      return false;
    }
    if (board[index].color === color && morethanTwo(board, index + direction, color, step + 1, direction)) {
      // console.log("succ 1");
      return true;
    }

    return false;
  }

  for (let i of [1, 5, 6, 7]) {
    // console.log(i);
    if (!(((i === 7 || i === 1) && index % 6 === 0) || (i === 5 && (index + 1) % 6 === 0))) {
      if (morethanTwo(board, index - i, color, step + 1, -i)) {
        // console.log("succ 2");
        return true;
      }
    }

    if (!((i === 5 && index % 6 === 0) || ((i === 7 || i === 1) && (index + 1) % 6 === 0))) {
      if (morethanTwo(board, index + i, color, step + 1, i)) {
        // console.log("succ 3");
        return true;
      }
    }
  }
  return false;
}
