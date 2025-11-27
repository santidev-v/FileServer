const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'log.txt');

const DB_BASE_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
};
const DB_NAME = process.env.DB_NAME || 'clase';

let pool;

function appendLog(message) {
  const line = `${new Date().toISOString()} | ${message}\n`;
  fs.appendFile(LOG_FILE, line, 'utf8', (err) => {
    if (err) console.error('No se pudo escribir el log', err);
  });
}

function logRequest(req, statusCode, detail) {
  const extra = detail ? ` | ${detail}` : '';
  appendLog(`${req.method} ${req.url} -> ${statusCode}${extra}`);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function reply(req, res, statusCode, payload, detail) {
  sendJson(res, statusCode, payload);
  logRequest(req, statusCode, detail);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Cuerpo demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

function ensureDatabaseAndTable() {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection(DB_BASE_CONFIG);
    connection.connect((err) => {
      if (err) return reject(err);

      connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``, (dbErr) => {
        if (dbErr) {
          connection.end();
          return reject(dbErr);
        }

        connection.query(`USE \`${DB_NAME}\``, (useErr) => {
          if (useErr) {
            connection.end();
            return reject(useErr);
          }

          const createTable = `CREATE TABLE IF NOT EXISTS productos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            precio DECIMAL(10,2) NOT NULL DEFAULT 0,
            descripcion VARCHAR(255) DEFAULT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`;

          connection.query(createTable, (tableErr) => {
            connection.end();
            if (tableErr) return reject(tableErr);
            resolve();
          });
        });
      });
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function getIdFromRequest(searchParams, body) {
  const raw = searchParams.get('id') ?? (body ? body.id : null);
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

async function handleGetProductos(req, res, searchParams) {
  const idParam = searchParams.get('id');
  if (idParam !== null && idParam !== '') {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return reply(req, res, 400, { error: 'El id debe ser numerico y mayor que cero' }, 'Id invalido');
    }

    const rows = await runQuery('SELECT * FROM productos WHERE id = ?', [id]);
    if (!rows.length) {
      return reply(req, res, 404, { error: 'Producto no encontrado' }, 'Producto no encontrado');
    }

    return reply(req, res, 200, { producto: rows[0] }, 'Producto obtenido');
  }

  const rows = await runQuery('SELECT * FROM productos');
  return reply(req, res, 200, { productos: rows }, 'Listado de productos');
}

async function handleCrearProducto(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch (err) {
    return reply(req, res, 400, { error: err.message }, err.message);
  }

  const nombre = body.nombre ? String(body.nombre).trim() : '';
  const precio = Number(body.precio);
  const descripcion = body.descripcion ? String(body.descripcion).trim() : null;

  if (!nombre || Number.isNaN(precio)) {
    return reply(req, res, 400, { error: 'Se requieren nombre y precio' }, 'Datos incompletos');
  }

  const result = await runQuery(
    'INSERT INTO productos (nombre, precio, descripcion) VALUES (?, ?, ?)',
    [nombre, precio, descripcion]
  );

  const inserted = await runQuery('SELECT * FROM productos WHERE id = ?', [result.insertId]);
  return reply(req, res, 201, { producto: inserted[0] }, 'Producto creado');
}

async function handleActualizarProducto(req, res, searchParams) {
  let body;
  try {
    body = await parseBody(req);
  } catch (err) {
    return reply(req, res, 400, { error: err.message }, err.message);
  }

  const id = getIdFromRequest(searchParams, body);
  if (!id) {
    return reply(req, res, 400, { error: 'Debe indicar un id valido' }, 'Id faltante');
  }

  const nombre = body.nombre ? String(body.nombre).trim() : '';
  const precio = Number(body.precio);
  const descripcion = body.descripcion ? String(body.descripcion).trim() : null;

  if (!nombre || Number.isNaN(precio)) {
    return reply(req, res, 400, { error: 'Se requieren nombre y precio' }, 'Datos incompletos');
  }

  const result = await runQuery(
    'UPDATE productos SET nombre = ?, precio = ?, descripcion = ? WHERE id = ?',
    [nombre, precio, descripcion, id]
  );

  if (!result.affectedRows) {
    return reply(req, res, 404, { error: 'Producto no encontrado' }, 'Producto no encontrado');
  }

  const updated = await runQuery('SELECT * FROM productos WHERE id = ?', [id]);
  return reply(req, res, 200, { producto: updated[0] }, 'Producto actualizado');
}

async function handleEliminarProducto(req, res, searchParams) {
  const id = getIdFromRequest(searchParams, null);
  if (!id) {
    return reply(req, res, 400, { error: 'Debe indicar un id valido' }, 'Id faltante');
  }

  const result = await runQuery('DELETE FROM productos WHERE id = ?', [id]);
  if (!result.affectedRows) {
    return reply(req, res, 404, { error: 'Producto no encontrado' }, 'Producto no encontrado');
  }

  return reply(req, res, 200, { mensaje: 'Producto eliminado' }, 'Producto eliminado');
}

async function handleProductos(req, res, parsedUrl) {
  const searchParams = parsedUrl.searchParams;

  if (req.method === 'GET') return handleGetProductos(req, res, searchParams);
  if (req.method === 'POST') return handleCrearProducto(req, res);
  if (req.method === 'PUT') return handleActualizarProducto(req, res, searchParams);
  if (req.method === 'DELETE') return handleEliminarProducto(req, res, searchParams);

  return reply(req, res, 405, { error: 'Metodo no permitido' }, 'Metodo no permitido');
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (parsedUrl.pathname === '/productos') {
      await handleProductos(req, res, parsedUrl);
      return;
    }

    if (parsedUrl.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('API de productos: usa /productos con GET, POST, PUT, DELETE');
      logRequest(req, 200, 'Ruta raiz');
      return;
    }

    reply(req, res, 404, { error: 'Recurso no encontrado' }, 'Ruta no encontrada');
  } catch (err) {
    console.error('Error al procesar la peticion', err);
    reply(req, res, 500, { error: 'Error interno del servidor' }, err.message);
  }
});

ensureDatabaseAndTable()
  .then(() => {
    pool = mysql.createPool({ ...DB_BASE_CONFIG, database: DB_NAME, connectionLimit: 10 });
    server.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
      appendLog(`Servidor iniciado en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo preparar la base de datos', err);
  });
