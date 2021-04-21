var client;

var gameCodes = new Map();
var usersToGames = new Map();
var games = new Map();

var config = {
  prefix: null,
  min: 4,
  max: 10,
  ratio: 0.2,
};

const emojis = {
  number: [
    ':zero:',
    ':one:',
    ':two:',
    ':three:',
    ':four:',
    ':five:',
    ':six:',
    ':seven:',
    ':eight:',
    ':nine:',
  ],
};

var gameCount = 0;

const message = (msg) => {
  if (usersToGames.has(msg.member.id) && games.get(usersToGames.get(msg.member.id)).started)
    clickedPosition(msg);
  if (gameCodes.has(msg.content)) startGame(msg);

  if (!msg.content.startsWith(config.prefix) || usersToGames.has(msg.member.id)) return;

  var args = msg.content.substr(1, msg.content.length - config.prefix.length).split(' ');

  if (args[0].toLowerCase() != 'tictactoe') return;
  switch (args[1].toLowerCase()) {
    case 'newgame': {
      if (!msg.guild.me.hasPermission('MANAGE_MESSAGES'))
        return msg.channel.send(
          'I dont have permission to delete messages, please contact a server administrator'
        );
      newGame(msg);
      break;
    }
    case 'help': {
      var helpMessage = `How to play tictactoe:`;
      msg.channel.send(helpMessage);
    }
  }
};

function newGame(msg) {
  gameCount++;
  var game = {
    user1: msg.member.id,
    user2: null,
    channel: msg.channel.id,
    message: null,
    invite: null,
    key: null,
    oPoints: [],
    xPoints: [],
    turn: 0,
    board: [],
    started: false,
  };
  var inviteCode = makeid(5);
  var id = gameCount;
  game.invite = inviteCode;
  game.key = id;
  gameCodes.set(inviteCode, id);
  usersToGames.set(game.user1, id);
  games.set(id, game);
  msg.channel
    .send(
      `${
        msg.member
      } started a game of tictactoe! Type ${'`'}${inviteCode}${'`'} to join. Invite expires in 1 min`
    )
    .then((mg) => {
      game.message = mg.id;
    });
  deleteOutDated(id);
}

function clickedPosition(msg) {
  if (msg.content.length > 1) return;
  var user = msg.member.id;
  var id = usersToGames.get(user);
  var game = games.get(id);
  if (game.started == false) return;
  var intMsg = parseInt(msg.content);
  msg.delete();
  if (isNaN(intMsg) || intMsg > 9) return msg.channel.send('That is not a position on the board!');
  if (game.oPoints.includes(intMsg) || game.xPoints.includes(intMsg))
    return msg.channel.send('That position is already claimed!');
  var points = null;
  if (game.turn == 1) {
    if (game.user1 != user) return msg.channel.send('Its not your turn!');
    game.oPoints.push(intMsg);
    points = game.oPoints;
  } else {
    if (game.user2 != user) return msg.channel.send('Its not your turn!');
    game.xPoints.push(intMsg);
    points = game.xPoints;
  }
  if (isWin(points)) return endGame(game, msg.member.displayName);
  if (isCat(game.oPoints, game.xPoints)) return endGame(game, 'No One');
  game.turn = game.turn == 1 ? 2 : 1;
  generateBoard(game);
  sendBoard(game);
}

function deleteOutDated(id) {
  setTimeout(() => {
    if (!games.has(id)) return;
    var game = games.get(id);
    if (game.started) return;
    gameCodes.delete(game.invite);
    usersToGames.delete(game.user1);
    games.delete(id);
    var channel = client.channels.cache.get(game.channel);
    channel.messages.cache.get(game.message).edit('tictactoe Invite Expired!');
  }, 1000 * 60);
}

function startGame(msg) {
  var id = gameCodes.get(msg.content);
  var game = games.get(id);
  gameCodes.delete(msg.content);
  usersToGames.set(msg.member.id, id);
  game.started = true;
  game.user2 = msg.member.id;
  msg.delete();
  game.turn = 1;
  generateBoard(game);
  sendBoard(game);
}

function isWin(points) {
  var sorted = points.sort();
  if (
    sorted.includes(5) &&
    ((sorted.includes(1) && sorted.includes(9)) || (sorted.includes(3) && sorted.includes(7)))
  )
    return true; // diagonals
  for (var i of sorted) {
    if (i < 3 && sorted.includes(i + 3) && sorted.includes(i + 6)) return true; // verticals
    if (i % 3 == 1 && sorted.includes(i + 1) && sorted.includes(i + 2)) return true; // horizontals
  }
  return false;
}

function isCat(points1, points2) {
  var points = points1.concat(points2);
  var cat = true;
  for (var i = 1; i <= 9; i++) if (!points.includes(i)) cat = false;
  return cat;
}

function generateBoard(game) {
  game.board = [];
  var text = '';
  for (var e = 1; e <= 9; e++) {
    if (game.oPoints.includes(e)) text += ':x:';
    else if (game.xPoints.includes(e)) text += ':o:';
    else text += emojis.number[e];
    if (e % 3 == 0) {
      game.board.push(text);
      text = '';
    }
  }
}

function sendBoard(game) {
  client.channels.cache
    .get(game.channel)
    .messages.cache.get(game.message)
    .edit(
      (game.turn == 3 ? '' : (game.turn == 1 ? `<@${game.user1}>` : `<@${game.user2}>`) + '\n') +
        game.board.join('\n')
    );
}

function endGame(game, winner) {
  game.turn = 3;
  generateBoard(game);
  sendBoard(game);
  usersToGames.delete(game.user1);
  usersToGames.delete(game.user2);
  client.channels.cache.get(game.channel).send(winner + ' won!');
  games.delete(game.key);
}

function makeid(length) {
  var result = [];
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
  }
  return result.join('');
}

module.exports = {
  run: (inClient) => {
    client = inClient;
    config.prefix = client.config.prefix;
  },
  name: '',
  events: {
    message: message, // points to a function to be run on  message
  },
};
