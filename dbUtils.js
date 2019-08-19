const { db } = require('./dbConnection.js');

db.connect();

const getPolls = async () => {
    db.query('SELECT * FROM polls where is_closed = false ORDER BY id ASC')
        .then((results) => {
            return results.rows;
        });
};

const createPoll = async (request) => {
    const {
        pollTitle, choices, isClosed, channelName, channelId, teamName, teamId, isGame
    } = request;
    return db.query('INSERT INTO public.polls (poll_title, choices, is_closed, channel_name, channel_id, team_name, team_id, is_game)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
        [pollTitle, choices, isClosed, channelName, channelId, teamName, teamId, isGame]).then((results) => {
            return results;
        });
};

const findOne = async (req) => {
    const { teamId, channelId, isClosed } = req;
    return db.query('SELECT * FROM polls where team_id= $1 and channel_id =$2 and is_closed = $3 LIMIT 1',
        [teamId, channelId, isClosed]).then((results) => {
            return results.rows[0];
        });
};

const closePoll = async (req) => {
    console.log('Closing Poll: ', req);
    const { teamId, channelId } = req;
    return db.query('UPDATE polls set is_closed = true, closed_date = now() where team_id = $1 and channel_id =$2 and is_closed = false returning * ',
        [teamId, channelId])
        .then((results) => {
            return results;
        });
};

const replaceChoices = async (req) => {
    const { pollId, choices } = req;
    return db.query('UPDATE polls set choices = $1 where id = $2',
        [choices, pollId]).then((results) => {
            return results;
        });
};

const instertAuth = async (req) => {
    const { accessToken, scope, userId, teamName, teamId, bot } = req;
    const { botUserId, botAccessToken } = bot;
    return db.query('INSERT INTO public.auth' +
        '(access_token, "scope", user_id, team_name, team_id, bot_user_id, bot_access_token)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7)',
        [accessToken, scope, userId, teamName, teamId, botUserId, botAccessToken])
        .then((results) => {
            return results.rows;
        });
}

const getAuth = async (req) => {
    const { team_id, team_domain } = req;
    return db.query('SELECT * FROM public.auth where team_id= $1 and team_name=$2 LIMIT 1',
        [team_id, team_domain]).then((results) => {
            return results.rows[0];
        });
};


module.exports = {
    getPolls,
    createPoll,
    findOne,
    replaceChoices,
    closePoll,
    instertAuth,
    getAuth,
};
