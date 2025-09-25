const fs = require("fs");

//crud operations

//Create

    fs.writeFile("messages.txt", "iniciando archivo, primera línea!", (err) => {

    //si hay un error, lo lanza

    if (err) throw err;
    console.log("Archico creado con éxito!");
  });

  //Read

    fs.readFile("messages.txt", "utf-8", (err, data) => {
        if (err) throw err;
        console.log("Los Mensajes de la data son:\n", data);
    });

    //Update
    fs.appendFile("messages.txt", "\nAgregando una nueva línea al archivo", (err) => {
        if (err) throw err;
        console.log("Archivo actualizado con éxito!");
    });

    //Delete

    /*fs.unlink("messages.txt", (err) => {
        if (err) throw err;
        console.log("Archivo eliminado con éxito!");
    });
  */