
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const mongoClient = require('mongodb').MongoClient;
const objectId = require('mongodb').ObjectID;
const { pollFuncs } = require('./pollFunctions');
const { resFuncs } = require('./responseFunctions');
const { utils } = require('./utils');
const { db } = require('./dbUtils');
// Creates express app
const app = express();
// The port used for Express server
const PORT = 3000;
// The name of the database
const DATABASE_NAME = 'werewolf';
// Starts server
app.listen(process.env.PORT || PORT, () => {
    // mongoClient.connect(process.env.DATABASE_CONNECTION, {
    //     useNewUrlParser: true
    // }, (error, client) => {
    //     if (error) {
    //         console.log(`Unable to connect to ${process.env.DATABASE_CONNECTION}`);
    //         throw error;
    //     }
    //     database = client.db(DATABASE_NAME);
    //     collection = database.collection("polls");
    //     console.log("Connected to `" + DATABASE_NAME + "`!");
    // });
    console.log(`Bot is listening on port ${PORT}`);
});

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());

app.post('/', (req, res) => {
    const slashCommand = req.body.command;
    switch (slashCommand) {
        case '/werewolf':
            const requestBody = req.body;
            const commandArray = requestBody.text.split(' ');
            if (commandArray.length) {
                switch (commandArray[0]) {
                    case 'new':
                        pollFuncs.createNewPoll(res, requestBody, commandArray);
                        break;
                    case 'results':
                        collection.findOne({
                            teamId: requestBody.team_id,
                            channelId: requestBody.channel_id,
                            isClosed: false,
                        })
                            .then((poll) => {
                                const displayText = pollFuncs.getFormattedPollResults(poll);
                                res.status(200).send({
                                    text: displayText,
                                });
                            });
                        break;
                    case 'close':
                        collection.findOneAndUpdate({
                            teamId: requestBody.team_id,
                            channelId: requestBody.channel_id,
                            isClosed: false,
                        }, {
                                $set: {
                                    isClosed: true,
                                },
                            })
                            .then((response) => {
                                if (response.ok) {
                                    const pollResults = `Poll closed! \n${pollFuncs.getFormattedPollResults(response.value)}`;
                                    resFuncs.sendPublicResponse(res, pollResults);
                                } else {
                                    res.status(500).send(response);
                                }
                            });
                        break;
                    case 'vote':
                        pollFuncs.vote(res, requestBody, commandArray);
                        break;
                    default:
                        resFuncs.sendErrorResponse(res);
                        break;
                }
            }
            break;
        case '/modspeak':
            const modText = `*${utils.replaceAll(req.body.text.trim(), '\n', '*\n*')}*`;
            res.status(200).send({
                response_type: 'in_channel',
                text: modText,
            });
            break;
        default:
            resFuncs.sendErrorResponse(res);
            break;
    }
});

app.get('/slackauth', (req, res) => {
    console.log(req.query);
    request.post('https://slack.com/api/oauth.access', {
        form: {
            client_id: process.env.SLACK_CLIENT_ID,
            client_secret: process.env.SLACK_CLIENT_SECRET,
            code: req.query.code,
            redirect_uri: 'https://09fa5881.ngrok.io/slackauth',
        },
    }, (error, response, rawBody) => {
        if (error) {
            console.log(error);
        }
        const body = JSON.parse(rawBody);
        if (body.ok) {
            const authCollection = database.collection('auth');
            const newAuth = {
                accessToken: body.access_token,
                scope: body.scope,
                userId: body.user_id,
                teamName: body.team_name,
                teamId: body.team_id,
                bot: {
                    botUserId: body.bot.bot_user_id,
                    botAccessToken: body.bot.bot_access_token,
                },
            };
            authCollection.insertOne(newAuth, (error, result) => {
                if (error) {
                    res.status(500).send(error);
                }
                res.status(200).send(`<!DOCTYPE html>
                <html>
                    <body>
                        <h1>You have added Werewolf to Slack!</h1>
                    </body>
                </html>`);
            });
        } else {
            res.status(200).send(`<!DOCTYPE html>
                <html>
                    <body>
                        <p>${body.error}</p>
                    </body>
                </html>`);
        }
    });
});
