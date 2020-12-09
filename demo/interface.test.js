const { Builder, By, Key, Keys } = require("selenium-webdriver");
const { Driver } = require("selenium-webdriver/chrome");

async function test() {
  const francois = await new Builder().forBrowser("firefox").build();
  await francois.manage().window().maximize();
  const { height, width } = await francois.manage().window().getSize();
  await francois
    .manage()
    .window()
    .setSize(width / 2, height);
  await francois.manage().window().setPosition(0, 0);
  await francois.get("localhost:8080");

  // const fanny = await new Builder().forBrowser("firefox").build();
  // await fanny
  //   .manage()
  //   .window()
  //   .setSize(width / 2, height);
  // await fanny
  //   .manage()
  //   .window()
  //   .setPosition(width / 2, 0);
  // await fanny.get("localhost:8080");

  // let btnlogin_fr = await francois.findElement(By.id("btnConnecter"));
  // let inputPseudo_fr = await francois.findElement(By.id("pseudo"));

  // let btnlogin_fa = await fanny.findElement(By.id("btnConnecter"));
  // let inputPseudo_fa = await fanny.findElement(By.id("pseudo"));

  // let inputChat = await francois.findElement(By.id("monMessage"));

  // await wait(1000);

  // await type(inputPseudo_fa, "Fanny");

  // await wait(300);

  // await btnlogin_fa.click();

  // await type(inputPseudo_fr, "franc<ç<ssois");

  // await wait(500);

  // await btnlogin_fr.click();

  // await type(inputChat, "Les smileys :smiley<<<<<<grinn sont dispos");

  // await wait(5000);

  // //await francois.close();
  // await fanny.close();

  let frame = await francois.getWindowHandle();
  console.log(frame);

  await francois.executeScript("window.open('http://localhost:8080')");
  frame = await francois.getAllWindowHandles();
  frame = frame[1];
  console.log(frame);

  await francois.sleep(2000);

  await francois.switchTo().window(String(frame));

  let btnlogin_fr = await francois.findElement(By.id("btnConnecter"));
  let inputPseudo_fr = await francois.findElement(By.id("pseudo"));
  let inputChat = await francois.findElement(By.id("monMessage"));

  await type(inputPseudo_fr, "franc<ç<ssois");

  await wait(500);

  await btnlogin_fr.click();

  await type(inputChat, "Les smileys :smiley<<<<<<grinn sont dispos");

  await wait(5000);

  await francois.switchTo().window(String(frame));
  frame = await francois.getAllWindowHandles();

  frame = frame[0];
  await francois.switchTo().window(String(frame));

  btnlogin_fr = await francois.findElement(By.id("btnConnecter"));
  inputPseudo_fr = await francois.findElement(By.id("pseudo"));
  inputChat = await francois.findElement(By.id("monMessage"));

  await francois.sleep(2000);
  await type(inputPseudo_fr, "franc<ç<ssois");

  await wait(500);

  await btnlogin_fr.click();

  await type(inputChat, "Les smileys :smiley<<<<<<grinn sont dispos");

  await wait(5000);

  francois.getAllWindowHandles().then(console.log);

  await francois.sleep(2000);

  francois.close();
}

test();

function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
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
    }, 200);
  });
}
