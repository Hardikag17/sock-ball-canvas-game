const express = require('express');
const http = require('http');
const WebSocket = require('ws');
// const path = require('path');
// const fs = require('fs');

const app = express();
// app.use(express.static(path.join(__dirname, 'client')));

const server = http.createServer(app);
// clientHost -> Screen Number
const clientsList = new Map();
// Ws-> clientHost
const connections = new Map();

const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws, req) {
    const clientHost = req.headers.host;
    let screenNumForClient = -1;
    if (typeof clientHost === 'string' && clientHost.trim().length > 0) {
        if (clientsList.has(clientHost)) {
            screenNumForClient = clientsList.get(clientHost);
            // console.log('SCREEN ALREADY FOUND RETURNING SAME SCREEN', clientHost, screenNumForClient);
        } else {
            screenNumForClient = clientsList.size + 1;
            clientsList.set(clientHost, screenNumForClient);
            connections[ws] = clientHost;
        }
    }

    let withBall = 0;
    let online = wss.clients.size;

    ws.send(JSON.stringify({ type: 'screenNumber', data: screenNumForClient }));
    // console.log("CLIENT ADDED OK", req.headers.host, screenNumForClient);

    broadcast({ type: 'online', data: online });

    ws.on('message', function (data) {
        console.log(JSON.parse(data).data);
        const values = JSON.parse(data).data;
        const index = [...wss.clients].indexOf(ws);

        if (values[0] == 0) {
            withBall = [...wss.clients][index + 1] ? index + 1 : 0;
        } else {
            withBall = [...wss.clients][index - 1] ? index - 1 : [...wss.clients].length - 1;
        }
        let user_connection = connections[[...wss.clients][withBall]];
        withBall_screen_numebr = clientsList.get(user_connection);
        console.log("user_connection, withBall_screen_numebr: ", user_connection, withBall_screen_numebr);
        [...wss.clients][withBall].send(JSON.stringify({ type: 'ball.get', data: values }));
        broadcast({ type: 'withBall', data: withBall_screen_numebr }); // Current ball screen status
    });

    ws.on('close', function () {
        online = wss.clients.size;
        broadcast({ type: 'online', data: online });
    });
});

function broadcast(data) {
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
