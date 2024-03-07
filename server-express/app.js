const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();

const server = http.createServer(app);
const clientsList = {}; // { ws: WebSocket, screenNumber: number, clientuniqueId: string }
let clientsListAsArray = [];
const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws, req) {
    const clientUniqID = req?.url?.slice(req?.url?.indexOf('=') + 1);
    let screenNumForClient = -1;
    if (typeof clientUniqID === 'string' && clientUniqID.trim().length > 0) {
        if (clientsList[clientUniqID]) {
            screenNumForClient = clientsList[clientUniqID]?.screenNumber;
        } else {
            screenNumForClient = Object.keys(clientsList).length + 1;
        }

        clientsList[clientUniqID] = {
            ws: ws,
            screenNumber: screenNumForClient,
            clientUniqID: clientUniqID
        };

        clientsListAsArray = [...Object.keys(clientsList)?.map(e => clientsList?.[e])];
        // console.warn("clientsList: ", clientsList);
    }

    let online = wss.clients.size;

    ws.send(JSON.stringify({ type: 'screenNumber', data: screenNumForClient }));
    broadcast({ type: 'online', data: online });
    broadcast({ type: 'rostersize', data: clientsListAsArray?.length });

    ws.on('message', function (data) {
        const parsedData = JSON.parse(data);
        const values = parsedData?.data;
        const clientUniqueID = values?.[4];
        const currentClientScreenNum = clientsList[clientUniqueID]?.screenNumber;
        let targetClientID = null;

        // If values[0] === 0 then ball is sent backwards, and 1 if it's next screen.
        const isBallSentBackwardsToPrevScreen = values[0] === 0;
        let targetScreenOfBall = 0;

        if (isBallSentBackwardsToPrevScreen) {
            const res = clientsListAsArray?.find(e => e?.screenNumber === currentClientScreenNum - 1) ?? clientsListAsArray?.[clientsListAsArray?.length - 1];
            targetClientID = res?.clientUniqID;
            targetScreenOfBall = res?.screenNumber;
        } else {
            const res = clientsListAsArray?.find(e => e?.screenNumber === currentClientScreenNum + 1) ?? clientsListAsArray?.[0];
            targetClientID = res?.clientUniqID;
            targetScreenOfBall = res?.screenNumber;
        }

        clientsList[targetClientID].ws.send(JSON.stringify({ type: 'ball.get', data: values }));
        broadcast({ type: 'withBall', data: clientsList[targetClientID].screenNumber }); // Current ball screen status
    });

    ws.on('close', function (data) {
        console.warn(data);
        online = wss.clients.size;
        broadcast({ type: 'online', data: online });
        broadcast({ type: 'rostersize', data: wss?.clients?.size });
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
