const port = 3001;

const app = require("express")();
const server = require("http").createServer(app);

const io = require("socket.io")(server, { cors: { origin: "*" } });

const venom = require("venom-bot");
const fs = require("fs");
const mime = require("mime-types");

app.set("view engine", "ejs");
app.get("/home", (_req, res) => {
  res.render("home");
});

server.listen(port, () => {
  console.log(`Escutando a porta ${port}`);
});

var wppClient;
var socketClient;

function getExtension(mimetype) {
  const type = mimetype.split("/")[0];
  switch (type) {
    case "image":
      return "png";
    case "audio":
      return "mp3";
    case "video":
      return "mp4";
    default:
      return mime.extension(mimetype);
  }
}

io.on("connection", (socket) => {
  socketClient = socket;

  async function notifyMsg(msg) {
    let filepath = "";
    if (!(msg.mimetype === undefined)) {
      const buffer = await wppClient.decryptFile(msg);

      const filename = `${new Date().getTime()}.${mime.extension(
        msg.mimetype
      )}`;

      filepath = `/files/received/${filename}`;
      fs.writeFileSync(__dirname + filepath, buffer);
    }

    msg.mediaPath = filepath;
    socketClient.emit("newMsg", msg);
  }

  if (wppClient === undefined) {
    venom.create().then((client) => {
      wppClient = client;

      socketClient.emit("created", "Cliente whatsapp inicializado");

      wppClient.onMessage((msg) => {
        notifyMsg(msg);
      });
    });
  } else {
    socketClient.emit("created", "Cliente whatsapp inicializado");
  }

  socketClient.on("sendMsg", (number, msg, callback) => {
    const sendDir = __dirname + "/files/send";
    const files = fs.readdirSync(__dirname + "/files/send");

    if (files.length > 0) {
      const sendpath = `${sendDir}/${files[0]}`;

      sendFile(number, sendpath, msg, callback);
    } else {
      sendText(number, msg, callback);
    }
  });

  function sendText(number, msg, callback) {
    wppClient
      .sendText(number + "@c.us", msg)
      .then((data) => {
        callback(data);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function sendFile(number, sendpath, msg, callback) {
    wppClient
      .sendFile(
        number + "@c.us",
        sendpath,
        undefined,
        msg !== "" ? msg : undefined
      )
      .then((data) => {
        fs.unlinkSync(sendpath);
        callback(data);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function removeSendFile() {
    const sendDir = __dirname + "/files/send/";
    const files = fs.readdirSync(sendDir);

    if (files.length > 0) fs.unlinkSync(sendDir + files[0]);
  }

  socketClient.on("createFile", (mimetype) => {
    removeSendFile();

    fs.closeSync(
      fs.openSync(__dirname + "/files/send/file." + getExtension(mimetype), "w")
    );
  });

  socketClient.on("removeFile", () => {
    removeSendFile();
  });

  socketClient.on("sendChunks", (mimetype, chunks) => {
    fs.appendFileSync(
      __dirname + "/files/send/file." + getExtension(mimetype),
      chunks,
      (error) => {
        if (error !== null) console.log(error);
      }
    );
  });
});
