require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const request = require("request");
const mongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectID;

// Creates express app
const app = express();
// The port used for Express server
const PORT = 3000;
// The name of the database 
const DATABASE_NAME = "werewolf";
// Starts server
app.listen(process.env.PORT || PORT, function () {
    mongoClient.connect(process.env.DATABASE_CONNECTION, {
        useNewUrlParser: true
    }, (error, client) => {
        if (error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("polls");
        console.log("Connected to `" + DATABASE_NAME + "`!");
    });
    console.log('Bot is listening on port ' + PORT);
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post('/', (req, res) => {
    console.log(req.body);
    var slashCommand = req.body.command;
    switch (slashCommand) {
        case "/werepoll":
            var command = req.body.text;
            var commandArray = command.split(' ');
            if (commandArray.length) {
                console.log(commandArray);
                switch (commandArray[0]) {
                    case "new":
                        
                        if (commandArray.length > 2) {
                            var newPoll = {
                                title: commandArray[1],
                                choices: []
                            };
                            for (var i = 2; i < commandArray.length; i++) {
                                newPoll.choices.push({
                                    index: i - 1,
                                    name: commandArray[i],
                                    votes: []
                                });
                            };
                            sendResponse(res, req.body.channel_name, "new poll has been created", newPoll);
                        } else {
                            sendResponse(res, req.body.channel_name, "poll format must be /werepoll <<Title>> <<choice1>> <<choice2>>");
                        }
                        break;
                    case "results":
                        sendResponse(res, req.body.channel_name, "results");
                        break;
                    case "close":
                        sendResponse(res, req.body.channel_name, "close");
                        break;
                    case "vote":
                        sendResponse(res, req.body.channel_name, "voted!");
                        break;
                    default:
                        sendResponse(res, req.body.channel_name, "unable to determine command");
                        break;
                }
            }

            break;
        default:
            var data = {
                form: {
                    token: process.env.SLACK_AUTH_TOKEN,
                    channel: req.body.channel_name ? `#${req.body.channel_name}` : "#general",
                    text: "I don't recognize that command"
                }
            };
            request.post('https://slack.com/api/chat.postMessage', data, function (error, response, body) {
                res.json();
            });
            break;
    }
});

const sendResponse = function (res, channelName, text, dbInsert) {
    var data = {
        form: {
            token: process.env.SLACK_AUTH_TOKEN,
            channel: channelName ? `#${channelName}` : "#general",
            text: `You sent me: ${text}`
        }
    };
    if (dbInsert) {
        collection.insertOne(data, (error, result) => {
            if (error) {
                return response.status(500).send(error);
            }
            request.post('https://slack.com/api/chat.postMessage', data, function (error, response, body) {
                res.json();
            });
        });
    } else {
        request.post('https://slack.com/api/chat.postMessage', data, function (error, response, body) {
            res.json();
        });
    }

}