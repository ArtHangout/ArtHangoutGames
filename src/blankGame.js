var client;

var games = new Map();

var config = {
  prefix: null,
  min: 4,
  max: 10,
  ratio: 0.2,
};

const message = (msg) => {
  if (!msg.content.startsWith(config.prefix)) return;

  var args = msg.content.substr(1, msg.content.length - config.prefix.length).split(' ');

  if (args[0].toLowerCase() != 'GAME') return;
  switch (args[1].toLowerCase()) {
    case 'newgame': {
      if (!msg.guild.me.hasPermission('MANAGE_MESSAGES'))
        return msg.channel.send(
          'I dont have permission to delete messages, please contact a server administrator'
        );
      break;
    }
    case 'help': {
      var helpMessage = `How to play GAME:`;
      msg.channel.send(helpMessage);
    }
  }
};

function newGame() {}

function endGame() {}

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
