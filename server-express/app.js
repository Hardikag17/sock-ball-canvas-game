const express = require('express');
const http = require('http');
const WebSocket = require('ws');
// const path = require('path');
// const fs = require('fs');

const app = express();
// app.use(express.static(path.join(__dirname, 'client')));

const server = http.createServer(app);
// clientHost -> Screen Number
const clientsList = {};
let clientsListAsArray = [];
const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws, req) {
    const clientUniqID = req?.url?.slice(req?.url?.indexOf('=') + 1);
    console.log("clientHost", clientUniqID);
    let screenNumForClient = -1;
    if (typeof clientUniqID === 'string' && clientUniqID.trim().length > 0) {
        if (clientsList[clientUniqID]) {
            screenNumForClient = clientsList[clientUniqID]?.screenNumber;
            // console.log('SCREEN ALREADY FOUND RETURNING SAME SCREEN', clientUniqID, screenNumForClient);
        } else {
            screenNumForClient = Object.keys(clientsList).length + 1;
        }

        clientsList[clientUniqID] = {
            ws: ws,
            screenNumber: screenNumForClient,
            clientUniqID: clientUniqID
        };

        clientsListAsArray = [...Object.keys(clientsList)?.map(e => clientsList?.[e])];
        console.warn(clientsList);
    }

    let withBall = 0;
    let online = wss.clients.size;

    ws.send(JSON.stringify({ type: 'screenNumber', data: screenNumForClient }));
    // console.log("CLIENT ADDED OK", req.headers.host, screenNumForClient);

    broadcast({ type: 'online', data: online });
    broadcast({ type: 'rostersize', data: clientsListAsArray?.length });

    ws.on('message', function (data) {
        const parsedData = JSON.parse(data);
        console.log(parsedData);
        const values = parsedData?.data;
        const clientUniqueID = values?.[4];
        const currentClientScreenNum = clientsList[clientUniqueID]?.screenNumber;
        const currentClientObj = clientsList?.[clientUniqueID];
        let targetClientID = null;


        console.error(clientUniqueID);
        // If values[0] === 0 then ball is sent backwards, and 1 if it's next screen.
        const isBallSentBackwardsToPrevScreen = values[0] === 0;

        // const index = [...wss.clients].indexOf(ws);
        let targetScreenOfBall = 0;

        if (isBallSentBackwardsToPrevScreen) {
            const res = clientsListAsArray?.find(e => e?.screenNumber === currentClientScreenNum - 1) ?? clientsListAsArray?.[clientsListAsArray?.length - 1];
            targetClientID = res?.clientUniqID;
            targetScreenOfBall = res?.screenNumber;

            // for (const clientID in clientsList) {
            //     if (clientsList[clientID].screenNumber === currentClientScreenNum) {
            //         targetClientID = clientID;
            //         targetScreenOfBall = clientsList[targetClientID].screenNumber;
            //         break;
            //     }
            // }

            console.warn('previousScreenClientID', targetClientID, targetScreenOfBall);




            // withBall = [...wss.clients][index + 1] ? index + 1 : 0;
        } else {
            const res = clientsListAsArray?.find(e => e?.screenNumber === currentClientScreenNum + 1) ?? clientsListAsArray?.[0];
            targetClientID = res?.clientUniqID;
            targetScreenOfBall = res?.screenNumber;

            console.error(clientsListAsArray, currentClientScreenNum, targetClientID, targetScreenOfBall)


            // for (const clientID in clientsList) {
            //     if (clientsList[clientID].screenNumber - 1 === currentClientScreenNum) {
            //         targetClientID = clientID;
            //         targetScreenOfBall = clientsList[targetClientID].screenNumber;
            //         break;
            //     }
            // }

            console.warn('nextScreenClientID', targetClientID, targetScreenOfBall);


            // withBall = [...wss.clients][index - 1] ? index - 1 : [...wss.clients].length - 1;
        }

        // let user_connection = connections[[...wss.clients][withBall]];
        // withBall_screen_numebr = clientsList.get(user_connection);
        // console.log("user_connection, withBall_screen_numebr: ", user_connection, withBall_screen_numebr);
        clientsList[targetClientID].ws.send(JSON.stringify({ type: 'ball.get', data: values }));
        // [...wss.clients][withBall].send();
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
