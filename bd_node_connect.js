const mysql = require('mysql');

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    
});

con.connect((err)=> {
    if (err) throw err;
    console.log("Conexion a BDD exitosa!");

    //crear una base de datos  
    con.query("CREATE DATABASE clase", (err, result) => {
        if (err) throw err;
        console.log("Base de datos creada");
    });
});