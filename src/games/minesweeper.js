var client;

const games = new Map();
const alphabet = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
];

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
  empty: '⬜',
  clicked: '🟪',
  bomb: '🟥',
  flag: '🚩',
  exit: '❌',
};

const msg = (msg) => {
  if (games.has(msg.member.id)) clickPosition(games.get(msg.member.id), msg);

  if (!msg.content.startsWith(config.prefix)) return;

  var args = msg.content.substr(1, msg.content.length - config.prefix.length).split(' ');

  if (args[0].toLowerCase() != 'minesweeper') return;
  switch (args[1].toLowerCase()) {
    case 'newgame': {
      if (!msg.guild.me.hasPermission('MANAGE_MESSAGES'))
        return msg.channel.send(
          'I dont have permission to delete messages, please contact a server administrator'
        );
      var ammount = config.max;
      if (args[2]) ammount = parseInt(args[1]);
      var cheats = false;
      if (args[3]) cheats = args[3].includes('t');
      if (isNaN(ammount)) return msg.channel.send('That wasnt a valid number');
      if (ammount < config.min || ammount > config.max)
        return msg.channel.send(`That is outside the amount (${config.min} - ${config.max})`);
      newGame(msg.member.id, ammount, msg.channel.id, cheats);
      break;
    }
    case 'help': {
      var helpMessage = `How to play minesweeper:
 - Any of the surrounding squares could be bombs!
⬜⬜⬜
⬜:four:⬜
⬜⬜⬜
> In the square above you can tell that any 4 squares could be bombs!
> Mark places you think there are bombs with flags!

To start a game run ${config.prefix}minesweeper newgame [Size] [Cheats (true|false)]

To play, use the side and bottom bar to get the coordinates of the square you want to click 'a3'

To switch to flag mode click the flag. You can tell if its enabled if the bottom left corner is a ${emojis.flag}

To force end a game, click the ${emojis.exit}`;
      msg.channel.send(helpMessage);
    }
  }
};

const reaction = (reaction, user) => {
  if (!games.has(user.id)) return;
  if (reaction.emoji.name != emojis.flag && reaction.emoji.name != emojis.exit) return;
  var game = games.get(user.id);
  if (reaction.message.id != game.message) return;
  if (game.clicked.length == 0) return reaction.users.remove(user.id);
  reaction.users.remove(user.id);
  if (reaction.emoji.name == emojis.flag) {
    game.mode = game.mode == 1 ? 0 : 1;
    generateBoard(game);
  } else return gameOver(game);
  sendBoard(game);
};

function newGame(user, size, channelID, cheats) {
  if (games.has(user)) return;
  var bombs = Math.max(size * size * config.ratio);
  var startTime = Date.now();
  var game = {
    user: Object.freeze(user),
    size: Object.freeze(size),
    channel: Object.freeze(channelID),
    bombCount: Object.freeze(bombs),
    cheats: Object.freeze(cheats),
    startTime: Object.freeze(startTime),
    message: null,
    mode: 0,
    ended: false,
    bombs: [],
    clicked: [],
    flags: [],
    savedBoard: [],
  };
  generateBoard(game);
  sendBoard(game);
}

function sendBoard(game) {
  var channel = client.channels.cache.get(game.channel);
  var rows = [];
  for (var i of game.savedBoard)
    if (Array.isArray(i)) rows.push(i.join(''));
    else rows.push(i);
  var board = rows.join('\n');
  if (game.message == null)
    channel.send(board).then((msg) => {
      game.message = msg.id;
      games.set(game.user, game);
      msg.react(emojis.flag).then(() => msg.react(emojis.exit));
      return;
    });
  else channel.messages.fetch(game.message).then((msg) => msg.edit(board));
  games.set(game.user, game);
}

function setBombs(game) {
  var noPlace = [];
  for (var clicked of game.clicked) {
    for (var x = -1; x <= 1; x++)
      for (var y = -1; y <= 1; y++) noPlace.push(toPoint(x + clicked.x, clicked.y + y));
  }

  var bombs = game.bombCount;
  while (bombs > 0) {
    var x = getRandom(game.size) + 1;
    var y = getRandom(game.size);
    var bomb = toPoint(x, y);
    if (isOutOfBounds(bomb) || pointsInclude(game.bombs, bomb) || pointsInclude(noPlace, bomb))
      continue;
    bombs--;
    game.bombs.push(bomb);
  }
}

function clickPosition(game, message) {
  var msg = message.content;
  if (msg.length > 2) return;
  var y = letterToInt(msg.charAt(0));
  var x = hexToInt(msg.charAt(1));
  var clicked = toPoint(x, y);
  if (pointsInclude(game.clicked, clicked)) {
    message.channel.send('That position is clicked already!').then((warnMsg) => {
      warnMsg.delete({ timeout: 2000 });
    });
    message.delete();
    return;
  }
  if (isOutOfBounds(clicked)) {
    message.channel.send('Thats not a valid location').then((warnMsg) => {
      warnMsg.delete({ timeout: 2000 });
    });
    message.delete();
    return;
  }
  if (game.mode == 0) {
    if (game.clicked.length == 0) {
      game.clicked.push(clicked);
      setBombs(game);
    } else game.clicked.push(clicked);

    if (pointsInclude(game.bombs, clicked)) gameOver(game);
    else {
      multiClick(game, clicked);
    }
  } else {
    if (pointsInclude(game.flags, clicked)) removePoint(game.flags, clicked);
    else game.flags.push(clicked);
  }

  if (game.ended == false) {
    generateBoard(game);
    sendBoard(game);
  }

  if (isWin(game)) win(game); // game was won :O

  message.delete();
}

function generateBoard(game, showBombs) {
  if (!showBombs) showBombs = false;
  game.savedBoard = []; // clear to prevemt board from killing stuff

  game.savedBoard.push(`${game.flags.length}/${game.bombs.length}`);

  yLoop: for (var y = 0; y < game.size + 1; y++) {
    var arr = [];
    xLoop: for (var x = 0; x < game.size + 1; x++) {
      if (y < game.size && x == 0) {
        arr.push(toRegionalIndicator(alphabet[y]));
        continue xLoop;
      } // left bar

      if (y == game.size && x > 0) {
        arr.push(
          alphabet.includes(x.toString(16))
            ? toRegionalIndicator(x.toString(16))
            : emojis.number[x.toString(16)]
        );
        continue xLoop;
      } // bottom bar

      var point = toPoint(x, y);

      if (pointsInclude(game.flags, point)) {
        arr.push(emojis.flag);
        continue xLoop;
      } // flag points

      if ((showBombs || game.cheats) && pointsInclude(game.bombs, point)) {
        arr.push(emojis.bomb);
        continue xLoop;
      } // bomb points

      if (pointsInclude(game.clicked, point)) {
        var near = getNearByBombs(game, point);
        if (near == 0) arr.push(emojis.clicked);
        else arr.push(emojis.number[near]);
        continue xLoop;
      } // clicked points

      if (y == game.size && x == 0 && game.mode == 1) {
        arr.push(emojis.flag);
        continue xLoop;
      }

      arr.push(emojis.empty);
    }
    game.savedBoard.push(arr);
  }
}

function isWin(game) {
  if (game.flags.length != game.bombs.length) return false;
  var win = true;
  for (var flag of game.flags) {
    if (!pointsInclude(game.bombs, flag)) {
      win = false;
      break;
    }
  }
  return win;
}

function removePoint(points, point) {
  for (var p of points)
    if (compairPoints(p, point)) {
      points.splice(points.indexOf(p), 1);
      break;
    }
}

function multiClick(game, click) {
  var pointsToCheck = [];
  pointsToCheck.push(click);
  while (pointsToCheck.length > 0) {
    var p = pointsToCheck[0];
    for (var x = -1; x <= 1; x++)
      for (var y = -1; y <= 1; y++) {
        var point = toPoint(p.x + x, p.y + y);
        if (
          isOutOfBounds(point, game.size) ||
          pointsInclude(game.bombs, point) ||
          pointsInclude(game.clicked, point) ||
          pointsInclude(pointsToCheck, point)
        )
          continue;
        game.clicked.push(point);
        var near = getNearByBombs(game, point);
        if (near > 0) continue;
        pointsToCheck.push(point);
      }
    pointsToCheck.shift();
  }
}

function isOutOfBounds(point, size) {
  if (point.x < 1 || point.y < 0 || point.x > size + 1 || point.y > size) return true;
  return false;
}

function getNearByBombs(game, point) {
  var near = 0;
  for (var x = -1; x <= 1; x++)
    for (var y = -1; y <= 1; y++) {
      var x1 = point.x + x;
      var y1 = point.y + y;
      if (pointsInclude(game.bombs, toPoint(x1, y1))) near++;
    }
  return near;
}

function gameOver(game) {
  game.ended = true;
  generateBoard(game, true);
  sendBoard(game);
  var channel = client.channels.cache.get(game.channel);
  channel.send(`<@${game.user}> You died!`);
  games.delete(game.user);
}

function win(game) {
  var time = timeTaken(game);
  var channel = client.channels.cache.get(game.channel);
  channel.send(`<@${game.user}> You Won! You took ${time}`);
  games.delete(game.user);
}

function timeTaken(game) {
  var delta = Math.abs(Date.now() - game.startTime) / 1000;
  var days = Math.floor(delta / 86400);
  delta -= days * 86400;
  var hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;
  var minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;
  var seconds = Math.floor(delta % 60);
  var time = 'You took ';
  if (days > 0) time += days + 'days ';
  if (hours > 0) time += hours + 'hours ';
  if (minutes > 0) time += minutes + 'mins ';
  if (seconds > 0) time += seconds + 'seconds!';
  return time;
}

function letterToInt(letter) {
  if (alphabet.includes(letter)) return alphabet.indexOf(letter);
  return parseInt(letter);
}
function hexToInt(hex) {
  return parseInt(hex, 16);
}

function getRandom(max) {
  return Math.floor(Math.random() * max);
}

function toRegionalIndicator(letter) {
  return `:regional_indicator_${letter}:`;
}

function toPoint(x, y) {
  return { x: x, y: y };
}

function pointsInclude(points, point) {
  if (points.length == 0) return false;
  for (p of points) if (compairPoints(p, point)) return true;
  return false;
}

function compairPoints(p1, p2) {
  if (p1.x == p2.x && p1.y == p2.y) return true;
  return false;
}

module.exports = {
  run: (inClient) => {
    client = inClient;
    config.prefix = client.config.prefix;
  },
  name: 'minesweeper',
  events: {
    message: msg,
    messageReactionAdd: reaction,
  },
};
