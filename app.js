const http = require("http");
const math = require("./math");
// const {stringify} = require("querystring");

const server = http.createServer((req, res) => {
    res.writeHead(200),{"content-type": "text/plain"}
    res.end("Hello, World desde server con node.js")
});


server.listen(3000, () => {
    console.log("Servidor escuchando en el puerto 3000 en http://localhost:3000");
    console.log("Suma: ", math.add(5, 3));
    console.log("Resta: ", math.subtract(5, 3));
});
