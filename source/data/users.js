const { db } = require('../../dbConnection.js');
const logger = require('../../logFunctions');
db.connect().catch(error => {
    // Db Connect Throws errors even when it works,
    // It tries to authenticate with computer credentials before trying the .env credentials
    // console.log(error);
});

const getUser = async req => {
    const { playerId, teamId } = req;
    return db
        .query('SELECT * FROM public.users where team_id= $1 and player_id=$2 LIMIT 1', [
            teamId,
            playerId
        ])
        .then(results => {
            return results.rows[0];
        });
};

const insertUser = async req => {
    const { playerId, teamId, gamesPlayed } = req;
    return db
        .query(
            'INSERT INTO public.users' +
                '(player_id, games_played, team_id)' +
                'VALUES($1, $2, $3)',
            [playerId, gamesPlayed, teamId]
        )
        .then(results => {
            return results.rows;
        });
};

module.exports = {
    getUser,
    insertUser
};
