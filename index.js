
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const pollFuncs = require('./pollFunctions');
const resFuncs = require('./responseFunctions');
const utils = require('./utils');
const db = require('./dbUtils');
// Creates express app
const app = express();
// The port used for Express server
const PORT = 3000;

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());

app.post('/', (req, res) => {

    if (req.warmer) {
        res.send(`"Warmed": true`);
    }
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
                        db.findOne({
                            teamId: requestBody.team_id,
                            channelId: requestBody.channel_id,
                            isClosed: false,
                        })
                            .then((row) => {
                                const poll = pollFuncs.getPollfromResultRow(row);
                                const displayText = pollFuncs.getFormattedPollResults(poll);
                                res.status(200).send({
                                    text: displayText,
                                });
                            }).catch(err => {
                                console.log(err);
                                resFuncs.sendErrorResponse(res);
                            });
                        break;
                    case 'close':
                        db.closePoll({
                            teamId: requestBody.team_id,
                            channelId: requestBody.channel_id,
                        })
                            .then((response) => {
                                if (response.rowCount > 0) {
                                    const poll = pollFuncs.getPollfromResultRow(response.rows[0]);
                                    const pollResults = `Poll closed! \n${pollFuncs.getFormattedPollResults(poll)}`;
                                    resFuncs.sendPublicResponse(res, pollResults);
                                } else {
                                    res.status(500).send(response);
                                }
                            }).catch(err => {
                                console.log(err);
                                resFuncs.sendErrorResponse(res);
                            });
                        break;
                    case 'vote':
                        pollFuncs.vote(res, requestBody, commandArray);
                        break;
                    case "unvote":
                    case "remove":
                    case "annul":
                    case "rescind":
                    case "repeal":
                        pollFuncs.unvote(res, requestBody);
                        break;
                    default:
                        resFuncs.sendErrorResponse(res);
                        break;
                }
            }
            break;
        case '/modspeak':
            let modText = req.body.text.trim();
            modText = `*\`\`\`${req.body.text.trim()}\`\`\`*`;
            if (modText.includes(`-here`)) {
                modText = `<!here>\n${modText.replace('-here', '')}`
            }
            request.post({
                url: req.body.response_url,
                json: true,
                body: {
                    response_type: 'in_channel',
                    text: modText
                }
            });
            res.status(200).send({
                text: "Your message has been posted.",
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
            // const authCollection = database.collection('auth');
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
            db.insertAuth(newAuth)
                .then((response) => {
                    console.log(response);
                    if (!response.ok) {
                        res.status(500).send(response);
                    }
                    res.status(200).send(`<!DOCTYPE html>
                <html>
                    <body>
                        <h1>You have added Werewolf to Slack!</h1>
                    </body>
                </html>`);
                }).catch(err => {
                    console.log(err);
                    res.status(500).send(err);
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

// Starts Local server -- COMMENT OUT FOR DEPLOYMENT
// app.listen(process.env.PORT || PORT, () => {
//     console.log(`Bot is listening on port ${PORT}`);
// });

// Allows for Deployment - COMMENT OUT TO RUN LOCAL
module.exports = app;