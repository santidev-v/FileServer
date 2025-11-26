const http = require('http');
const fs = require('fs');
const fsp = fs.promises; // use promises helper for async/await
const path = require('path');
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();

// Eventos para operaciones de archivos
eventEmitter.on('fileRead', (filename) => {
    console.log(`El archivo "${filename}" fue leído correctamente.`);
});
eventEmitter.on('fileWrite', (filename) => {
    console.log(`El archivo "${filename}" fue creado/escrito.`);
});
eventEmitter.on('fileAppend', (filename) => {
    console.log(`Se agregó contenido al archivo "${filename}".`);
});
eventEmitter.on('fileDelete', (filename) => {
    console.log(`El archivo "${filename}" fue eliminado.`);
});

// Archivo principal de datos y de logs
const DATA_FILE = path.join(__dirname, 'messages.txt');
const LOG_FILE = path.join(__dirname, 'log.txt');


async function registrarLog(req) {
    const timestamp = new Date().toISOString();
    const method = req.method || 'GET';
    // En caso de que req.url venga sin host, construimos una URL base segura
    const base = `http://${req.headers.host || 'localhost'}`;
    let url;
    try { url = new URL(req.url, base); } catch (e) { url = { pathname: req.url }; }

    const entrada = `${timestamp} | ${method} | ${url.pathname || req.url}\n`;

    try {
        await fsp.appendFile(LOG_FILE, entrada, 'utf8');
    } catch (err) {
        // No interrumpir el servidor por errores de log
        console.error('Error al escribir en log:', err);
    }
}

// Crear servidor HTTP con rutas separadas para cada operación del módulo fs
const server = http.createServer(async (req, res) => {
    await registrarLog(req);

    // Construir objeto URL para leer query params desde navegador
    const base = `http://${req.headers.host || 'localhost'}`;
    let parsed;
    try { parsed = new URL(req.url, base); } catch (e) { parsed = { pathname: req.url, searchParams: new URLSearchParams() }; }
    const pathname = parsed.pathname;
    const params = parsed.searchParams;

    
    try {
        if (pathname === '/' ) {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Bienvenido al servidor de archivos. Usa /leer-archivo, /escribir-archivo, /agregar-archivo, /eliminar-archivo, /leer-log');

        } else if (pathname === '/leer-archivo') {
            // Leer el archivo de datos
            try {
                const data = await fsp.readFile(DATA_FILE, 'utf8');
                eventEmitter.emit('fileRead', path.basename(DATA_FILE));
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(data);
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('No se pudo leer el archivo (¿existe messages.txt?).');
            }

        } else if (pathname === '/escribir-archivo') {
            // Escribir/crear el archivo. Se puede pasar ?contenido=texto desde el navegador
            const contenido = params.get('contenido') || 'Contenido por defecto';
            await fsp.writeFile(DATA_FILE, contenido, 'utf8');
            eventEmitter.emit('fileWrite', path.basename(DATA_FILE));
            res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Archivo creado/escrito correctamente.');

        } else if (pathname === '/agregar-archivo') {
            // Agregar contenido al final del archivo
            const contenido = params.get('contenido') || '\n';
            await fsp.appendFile(DATA_FILE, contenido, 'utf8');
            eventEmitter.emit('fileAppend', path.basename(DATA_FILE));
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Contenido agregado al archivo.');

        } else if (pathname === '/eliminar-archivo') {
            // Eliminar el archivo
            try {
                await fsp.unlink(DATA_FILE);
                eventEmitter.emit('fileDelete', path.basename(DATA_FILE));
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Archivo eliminado.');
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('No se pudo eliminar el archivo (quizá no existe).');
            }

        } else if (pathname === '/leer-log') {
            // Leer el archivo de logs
            try {
                const logs = await fsp.readFile(LOG_FILE, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(logs);
            } catch (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('No hay logs aún (log.txt no existe).');
            }

        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Página no encontrada');
        }
    } catch (err) {
        // Manejo general de errores
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error interno del servidor');
        console.error('Error procesando la petición:', err);
    }
});

// Iniciar servidor
server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});