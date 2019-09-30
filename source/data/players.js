const {
    db
} = require('../../dbConnection.js');
const logger = require('../../logFunctions');
const users = require('./users.js');
db.connect()
    .catch(error => {
        // Db Connect Throws errors even when it works, 
        // It tries to authenticate with computer credentials before trying the .env credentials
        // console.log(error);
    });

const insertPlayers = async (req) => {
    const {
        gameId,
        teamId,
        players
    } = req;
    queryValues = 'VALUES';
    for (i = 0; i < players.length; i++) {
        const user = await users.getUser({
            playerId: players[i].playerId,
            teamId: teamId
        });
        const roleId = 1;
        console.log(user);
        queryValues += '(' + user.id + ',';
        queryValues += roleId + ', \'';
        queryValues += gameId + '\')';
        if (i < players.length - 1) {
            queryValues += ',';
        } else {
            queryValues += ';';
        }
    }
    console.log(queryValues);
    return db.query('INSERT INTO public.players(user_id, role_id, game_id)' + queryValues)
        .then((results) => {
            return results.rows;
        });
}


module.exports = {
    insertPlayers
};