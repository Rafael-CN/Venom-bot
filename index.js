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

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  venom.create().then((client) => {
    io.emit("created", "Cliente whatsapp inicializado");

    socket.on("sendMsg", (number, msg, callback) => {
      const sendpath = __dirname + "/files/send/send.png";

      if (fs.existsSync(sendpath)) {
        client
          .sendImage(number + "@c.us", sendpath, "Foto", msg)
          .then((data) => {
            fs.unlink(sendpath, (error) => {
              console.log(error);
            });
            callback(data);
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        client
          .sendText(number + "@c.us", msg)
          .then((data) => {
            callback(data);
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });

    socket.on("sendChunks", (chunks) => {
      fs.appendFileSync(__dirname + "/files/send/send.png", chunks, (error) => {
        if (error !== null) console.log(error);
      });
    });

    client.onMessage(async (msg) => {
      let filepath = "";
      if (!(msg.mimetype === undefined)) {
        const buffer = await client.decryptFile(msg);

        const filename = `${new Date().getTime()}.${mime.extension(
          msg.mimetype
        )}`;

        filepath = `/files/received/${filename}`;
        await fs.writeFile(__dirname + filepath, buffer, (error) => {
          console.log(error);
        });
      }

      msg.mediaPath = filepath;
      io.emit("newMsg", msg);
    });
  });
});
