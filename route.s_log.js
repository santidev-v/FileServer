const http = require('http');
const fs = require('fs').promises; // Using Promises for file operations
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

const eventEmitter = new EventEmitter();

// Event listener for logging when a file is read
eventEmitter.on('fileRead', (filename) => {
    console.log(`File "${filename}" has been read successfully.`);
});

// Function to log requests
async function logRequest(req) {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    const logFilePath = path.join(__dirname, 'log.txt');
    
    try {
        await fs.appendFile(logFilePath, logMessage);
    } catch (err) {
        console.error('Error writing to log file:', err);
    }
}

// Create an HTTP server
const server = http.createServer(async (req, res) => {
    await logRequest(req); // Log each request

    if (req.url === '/') {
        const filePath = path.join(__dirname, 'message.txt');

        try {
            const data = await fs.readFile(filePath, 'utf8');
            eventEmitter.emit('fileRead', 'message.txt');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(data);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading file.');
        }

    } else if (req.url === '/info') {
        // Get system information using the os module
        const systemInfo = {
            platform: os.platform(),
            architecture: os.arch(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
            uptime: os.uptime()
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(systemInfo, null, 2));

    } else if (req.url === '/time') {
        // Get current server time
        const currentTime = new Date().toLocaleString();

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`Current Server Time: ${currentTime}`);

    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Page Not Found');
    }
});

// Start the server
server.listen(3000, () => {
    console.log('Server running at http://localhost:3000/');
});