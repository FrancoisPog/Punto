const { Builder, By, Key, Keys } = require("selenium-webdriver");

async function test() {
  const francois = await createDriver();
  await francois.manage().window().maximize();
  const { height, width } = await francois.manage().window().getSize();
  // await francois
  //   .manage()
  //   .window()
  //   .setSize(width / 2, height);
  //await francois.manage().window().setPosition(0, 0);
  await francois.get("localhost:8080");

  await newTab(francois); // 1

  await login(francois, "Franc<ss<<çois");

  await francois.sleep(1000);

  await switchTab(francois, 0);

  await login(francois, "Fannnnnn<<<<y");

  await mouseOn(francois, "html body.connected aside#menu label#sound-label", 2000);

  await createGame(francois);

  await francois.sleep(1000);

  await clickOn(francois, "/html/body/div[3]/div[2]/div[6]/aside/p[2]"); // Inviter

  await switchTab(francois, 1);

  await francois.sleep(2000);

  await clickOn(francois, "/html/body/div[3]/div[2]/div[6]/section/div"); // Rejoindre

  await francois.sleep(1000);

  await francois
    .manage()
    .window()
    .setSize(width / 2, height);
  await francois.manage().window().setPosition(0, 0);
  await francois.sleep(1000);

  await clickOn(francois, "/html/body/aside/label[2]/span");
  await francois.sleep(1000);

  await switchTab(francois, 0);
  await francois.sleep(1000);

  await clickOn(francois, "/html/body/aside/label[2]/span");

  await francois.sleep(1000);

  const fanny = await createDriver();

  await fanny
    .manage()
    .window()
    .setSize(width / 2, height);
  await fanny
    .manage()
    .window()
    .setPosition(width / 2, 0);

  await fanny.get("http://localhost:8080");

  await login(fanny, "Fanoche");
  await clickOn(fanny, "/html/body/aside/label[2]/span");

  await clickOn(francois, "/html/body/div[3]/div[2]/div[6]/aside/p[3]"); // Inviter

  await francois.sleep(1000);

  await clickOn(fanny, "/html/body/div[3]/div[2]/div[6]/section/div"); // Rejoindre

  await fanny.sleep(1000);

  await clickOn(francois, "/html/body/div[3]/div[2]/div[6]/section/div"); // Lancer partie

  await fanny.sleep(1000);
  await francois.sleep(1000);

  let currentDriver = francois;
  let currentTab = 0;

  while (true) {
    let card = await currentDriver.findElement(By.xpath("/html/body/div[3]/div[2]/div[6]/div[1]/div"));
    while ((await card.getAttribute("class")).match("back")) {
      if (currentDriver === francois && currentTab === 0) {
        console.log("c1");
        currentTab = 1;
        switchTab(francois, 1);
      } else if (currentDriver === francois && currentTab === 1) {
        console.log("c2");
        currentDriver = fanny;
      } else {
        console.log("c3");
        currentDriver = francois;
        currentTab = 0;
        switchTab(francois, 0);
      }
      card = await currentDriver.findElement(By.xpath("/html/body/div[3]/div[2]/div[6]/div[1]/div"));
    }

    console.log("turn");

    await play(currentDriver, "/html/body/div[3]/div[2]/div[6]/div[1]/div", "/html/body/div[3]/div[2]/div[6]/div[4]");
    await francois.sleep(1000);
  }

  // await francois.close();
  // await francois.sleep(1000);
  // await francois.close();
}

test();

// ************************************************
//                    FUNCTIONS
// ************************************************

async function mouseOn(driver, css, time = 1000) {
  await driver.executeScript(`document.querySelector('${css}').classList.add('hover')`);

  await driver.sleep(time);

  await driver.executeScript(`document.querySelector('${css}').classList.remove('hover')`);
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
  console.log(frame);

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

function type(elt, text) {
  return new Promise((resolve) => {
    text = text.split("");
    let int = setInterval(async () => {
      let symbol = text.shift();
      if (symbol === "<") {
        symbol = Key.BACK_SPACE;
      }
      await elt.sendKeys(symbol);
      if (text.length === 0) {
        clearInterval(int);
        resolve();
      }
    }, 50);
  });
}

async function play(driver, cardXPath, boardXPath) {
  card = await driver.findElement(By.xpath(cardXPath));
  card = await htmlCardToCard(card);

  let board = await htmlBoardToBoard(driver, boardXPath);

  let index = playAI(board, card);
  console.log("index choisi :" + index);

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
        console.log(morethanTwo(board, i, card.color, 0, null));
        if (morethanTwo(board, i, card.color, 0, null)) {
          for (let j in Array(10000).fill(null)) {
            pb.push(i);
          }
        }
      }
    }
  }
  console.log("Possibilité", pb);
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
        console.log("ica : " + index + String(-i));
        return true;
      }
    }
    if (!((i === 5 && index % 6 === 0) || ((i === 7 || i === 1) && (index + 1) % 6 === 0))) {
      if (
        index + i <= 35 &&
        ((color && board[index + i] && board[index + i].color === color) || (!color && board[index + i]))
      ) {
        console.log("ica : " + index + String(i));
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
  console.log("mt2", index, color, step, direction);
  if (step) {
    if (!board[index] || board[index].color !== color) {
      return false;
    } else if (step === 2) {
      console.log("moreThan2 : success !");
      return true;
    }
  }

  if (direction) {
    console.log(direction);
    if (
      ((direction === -7 || direction === -1) && index % 6 === 0) ||
      (direction === -5 && (index + 1) % 6 === 0) ||
      (direction === 5 && index % 6 === 0) ||
      ((direction === 7 || direction === 1) && (index + 1) % 6 === 0)
    ) {
      return false;
    }
    if (board[index].color === color && morethanTwo(board, index + direction, color, step + 1, direction)) {
      console.log("succ 1");
      return true;
    }

    return false;
  }

  for (let i of [1, 5, 6, 7]) {
    console.log(i);
    if (!(((i === 7 || i === 1) && index % 6 === 0) || (i === 5 && (index + 1) % 6 === 0))) {
      if (morethanTwo(board, index - i, color, step + 1, -i)) {
        console.log("succ 2");
        return true;
      }
    }

    if (!((i === 5 && index % 6 === 0) || ((i === 7 || i === 1) && (index + 1) % 6 === 0))) {
      if (morethanTwo(board, index + i, color, step + 1, i)) {
        console.log("succ 3");
        return true;
      }
    }
  }
  return false;
}
