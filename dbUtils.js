const { db } = require('./dbConnection.js');

db.connect();

const getPolls = () => {
    db.query('SELECT * FROM polls where is_closed = false ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error;
        }
        return results.rows;
    });
};

const createPoll = (request) => {
    const {
        pollTitle, choices, isClosed, channelName, channelId, teamName, teamId,
    } = request.body;
    db.query('INSERT INTO public.polls (poll_title, choices, is_closed, channel_name, channel_id, team_name, team_id)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7)',
        [pollTitle, choices, isClosed, channelName, channelId, teamName, teamId], (error, results) => {
            if (error) {
                throw error;
            }
            return results.rows;
        });
};

const findOne = (req) => {
    const { teamId, channelId, isClosed } = req;
    db.query('SELECT * FROM polls where team_id= $1 and channel_id =$2 and is_closed = $3 LIMIT 1',
        [teamId, channelId, isClosed],
        (error, results) => {
            if (error) {
                throw error;
            }
            return results.rows;
        });
};

const closePoll = (req) => {
    const { teamId, channelId } = req;
    db.query('UPDATE polls set is_closed = true where team_id = $1 and channel_id =$2',
        [teamId, channelId],
        (error, results) => {
            if (error) {
                throw error;
            }
            return results.rows;
        });
};

const replaceChoices = (req) => {
    const { pollId, choices } = req;
    db.query('UPDATE polls set choices = $1 where id = $2',
        [choices, pollId],
        (error, results) => {
            if (error) {
                throw error;
            }
            return results.rows;
        });
};

const instertAuth = (req) => {
    const { accessToken, scope, userId, teamName, teamId, bot } = req;
    cosnt { botUserId, botAccessToken } = bot;
    db.query('INSERT INTO public.auth' +
        '(access_token, "scope", user_id, team_name, team_id, bot_user_id, bot_access_token)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7)',
        [accessToken, scope, userId, teamName, teamId, botUserId, botAccessToken],
        (error, results) => {
            if (error) {
                throw error;
            }
            return results.rows;
        });

}

const x = {
    accessToken: body.access_token,
    scope: body.scope,
    userId: body.user_id,
    teamName: body.team_name,
    teamId: body.team_id,
    bot: {
        botUserId: body.bot.bot_user_id,
        botAccessToken: body.bot.bot_access_token,
    },
}

module.exports = {
    getPolls,
    createPoll,
    findOne,
    replaceChoices,
};
