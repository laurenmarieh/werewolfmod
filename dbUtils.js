const {
    db
} = require('./dbConnection.js');
const logger = require('./logFunctions');

db.connect();

const getPolls = async () => {
    db.query('SELECT * FROM polls where is_closed = false ORDER BY id ASC')
        .then((results) => {
            return results.rows;
        });
};

const createPoll = async (request) => {
    const {
        pollTitle,
        isClosed,
        channelName,
        channelId,
        teamName,
        teamId,
        isGame,
        choices
    } = request;
    return db.query('INSERT INTO public.polls (poll_title, is_closed, channel_name, channel_id, team_name, team_id, is_game, choices)' +
        'VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
        [pollTitle, isClosed, channelName, channelId, teamName, teamId, isGame, {}]).then((pollResults) => {
        return findOne({
            teamId: teamId,
            channelId: channelId,
            isClosed: false
        }).then(insertedPoll => {
            queryValues = 'VALUES';
            for (i = 0; i < choices.length; i++) {
                queryValues += '(' + insertedPoll.id + ',';
                queryValues += choices[i].index + ', \'';
                queryValues += choices[i].name + '\')';
                if (i < choices.length - 1) {
                    queryValues += ',';
                } else {
                    queryValues += ';';
                }
            }
            return db.query('INSERT INTO public.poll_options (poll_id, option_index, option_name)' + queryValues)
                .then(optionResults => {
                    logger.logInfo(JSON.stringify(optionResults));
                    return pollResults;
                });
        });
    });
};

const findOne = async (req) => {
    const {
        teamId,
        channelId,
        isClosed
    } = req;
    return db.query('SELECT * FROM polls where team_id= $1 and channel_id =$2 and is_closed = $3 LIMIT 1',
        [teamId, channelId, isClosed]).then((results) => {
        return results.rows[0];
    });
};

const findOneWithResults = async (req) => {
    const {
        teamId,
        channelId,
        isClosed
    } = req;
    return db.query('SELECT *, poll_votes.id as poll_vote_id, poll_options.id as poll_options_id FROM polls INNER JOIN poll_options ON polls.id = poll_options.poll_id LEFT JOIN poll_votes ON poll_options.id = poll_votes.option_id where polls.team_id= $1 and polls.channel_id =$2 and polls.is_closed = $3',
    [teamId, channelId, isClosed]).then((results) => {
        return results.rows;
    });
};

const findOneByIdWithResults = async (id) => {
    return db.query('SELECT * FROM polls INNER JOIN poll_options ON polls.id = poll_options.poll_id LEFT JOIN poll_votes ON poll_options.id = poll_votes.option_id where polls.id= $1',
        [id]).then((results) => {
        return results.rows;
    });
};

const closePoll = async (req) => {
    logger.logInfo('Closing Poll: ' + JSON.stringify(req));
    const {
        teamId,
        channelId
    } = req;
    return db.query('UPDATE polls set is_closed = true, closed_date = now() where team_id = $1 and channel_id =$2 and is_closed = false returning * ',
            [teamId, channelId])
        .then((results) => {
            return findOneByIdWithResults(results.rows[0].id);
        });
};

const replaceVote = async (req) => {
    const {
        voteId,
        optionId
    } = req;
    return db.query('UPDATE poll_votes set option_id = $1 where id = $2',
        [optionId, voteId]).then((results) => {
        return results;
    });
};

const instertAuth = async (req) => {
    const {
        accessToken,
        scope,
        userId,
        teamName,
        teamId,
        bot
    } = req;
    const {
        botUserId,
        botAccessToken
    } = bot;
    return db.query('INSERT INTO public.auth' +
            '(access_token, "scope", user_id, team_name, team_id, bot_user_id, bot_access_token)' +
            'VALUES($1, $2, $3, $4, $5, $6, $7)',
            [accessToken, scope, userId, teamName, teamId, botUserId, botAccessToken])
        .then((results) => {
            return results.rows;
        });
}

const getAuth = async (req) => {
    const {
        team_id,
        team_domain
    } = req;
    return db.query('SELECT * FROM public.auth where team_id= $1 and team_name=$2 LIMIT 1',
        [team_id, team_domain]).then((results) => {
        return results.rows[0];
    });
};


module.exports = {
    getPolls,
    createPoll,
    findOne,
    findOneWithResults,
    replaceVote,
    closePoll,
    instertAuth,
    getAuth,
};