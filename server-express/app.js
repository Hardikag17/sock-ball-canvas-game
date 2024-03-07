const express = require('express');
const http = require('http');
const WebSocket = require('ws');
// const path = require('path');
// const fs = require('fs');

const app = express();
// app.use(express.static(path.join(__dirname, 'client')));

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws) {
    let withBall = 0;
    console.log("withBall", withBall)
    let online = wss.clients.size;
    console.log("online", online)

    let screenNumber = wss.clients.size - 1;
    ws.send(JSON.stringify({ type: 'screenNumber', data: screenNumber }));
    broadcast({ type: 'online', data: online });

    ws.on('message', function (data) {
        const values = JSON.parse(data).data;
        const index = [...wss.clients].indexOf(ws);

        if (values[0] == 0) {
            withBall = [...wss.clients][index + 1] ? index + 1 : 0;
        } else {
            withBall = [...wss.clients][index - 1] ? index - 1 : [...wss.clients].length - 1;
        }

        [...wss.clients][withBall].send(JSON.stringify({ type: 'ball.get', data: values }));
        broadcast({ type: 'withBall', data: withBall }); // Current ball screen status
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
