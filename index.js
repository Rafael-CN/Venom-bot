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
      client
        .sendText(number + "@c.us", msg)
        .then((data) => {
          callback(data);
        })
        .catch((error) => {
          console.log(error, { number, msg, callback });
        });
    });

    client.onMessage(async (msg) => {
      let filepath = "";
      if (!(msg.mimetype === undefined)) {
        const buffer = await client.decryptFile(msg);

        const filename = `${new Date().getTime()}.${mime.extension(
          msg.mimetype
        )}`;

        filepath = `/files/${filename}`;
        await fs.writeFile(__dirname + filepath, buffer, (error) => {
          console.log(error);
        });
      }

      msg.mediaPath = filepath;
      io.emit("newMsg", msg);
    });
  });
});
