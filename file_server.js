const fs = require("fs");
const http = require("http");
const path = require("path");
const eventos = require("events");

//Create event emitter
const EventEmitter = new eventos();

//Registro de evento
EventEmitter.on("fileRead", (filename)=>{
    console.log(`El archivo "${filename}" fue leido con exito`);
});
// Eventos adicionales para CRUD
EventEmitter.on("fileCreate", (filename)=>{
    console.log(`El archivo "${filename}" fue creado.`);
});
EventEmitter.on("fileUpdate", (filename)=>{
    console.log(`El archivo "${filename}" fue actualizado.`);
});
EventEmitter.on("fileDelete", (filename)=>{
    console.log(`El archivo "${filename}" fue eliminado.`);
});

//Server
const server = http.createServer((req, res)=>{
    //Registro ruta root
    if(req.url === "/"){
        res.writeHead(200, {"content-type": "text/plain"});
        res.end("Bienvenido al servidor de archivos");
    }else if(req.url === "/leer"){  // Registro ruta servicio leer
        const filePath = path.join(__dirname, "messages.txt");
        fs.readFile(filePath, "utf-8", (err, data)=>{
            //Error leyendo archivo
            if(err){
                //Mensaje de error por http
                res.writeHead(500, {"content-type": "text/plain"});
                res.end("error Leyendo arvhivo");
            };

            //Caso de exito - leemos archivo
            //Evento de leer archivo
            EventEmitter.emit("fileRead", "messages.txt");
            //Data por http
            res.writeHead(200, {"content-type": "text/plain"});
            res.end(data);
        });
    }
        // Crear archivo o agregar contenido
        else if (req.url.startsWith("/crear")) {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", () => {
                const filePath = path.join(__dirname, "messages.txt");
                fs.writeFile(filePath, body, (err) => {
                    if (err) {
                        res.writeHead(500, {"content-type": "text/plain"});
                        res.end("Error creando archivo");
                    } else {
                        EventEmitter.emit("fileCreate", "messages.txt");
                        res.writeHead(201, {"content-type": "text/plain"});
                        res.end("Archivo creado");
                    }
                });
            });
        }
        // Actualizar archivo
        else if (req.url.startsWith("/actualizar")) {
            let body = "";
            req.on("data", chunk => { body += chunk; });
            req.on("end", () => {
                const filePath = path.join(__dirname, "messages.txt");
                fs.appendFile(filePath, body, (err) => {
                    if (err) {
                        res.writeHead(500, {"content-type": "text/plain"});
                        res.end("Error actualizando archivo");
                    } else {
                        EventEmitter.emit("fileUpdate", "messages.txt");
                        res.writeHead(200, {"content-type": "text/plain"});
                        res.end("Archivo actualizado");
                    }
                });
            });
        }
        // Eliminar archivo
        else if (req.url.startsWith("/eliminar")) {
            const filePath = path.join(__dirname, "messages.txt");
            fs.unlink(filePath, (err) => {
                if (err) {
                    res.writeHead(500, {"content-type": "text/plain"});
                    res.end("Error eliminando archivo");
                } else {
                    EventEmitter.emit("fileDelete", "messages.txt");
                    res.writeHead(200, {"content-type": "text/plain"});
                    res.end("Archivo eliminado");
                }
            });
        }
    else{
        res.writeHead(404,{"content-type": "text/plain"});
        res.end("Page not found");
    }
});

server.listen(3000, ()=>{
    console.log("Server Running at http://localhost:3000");
});