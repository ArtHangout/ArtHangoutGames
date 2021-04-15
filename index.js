const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const requireall = require('require-all');

client.config = config;
client.events = new Map();
client.games = new Set();

const gameFiles = requireall({
  dirname: `${__dirname}/src/games`,
  filter: /(.+)\.js$/,
});

for (var key in gameFiles) {
  var file = gameFiles[key];
  if (!file) continue;
  file.run(client);
  if (file.events != null) {
    for (var key of Object.keys(file.events)) {
      if (client.events.has(key)) client.events.get(key).push(file.events[key]);
      else client.events.set(key, [file.events[key]]);
    }
  }
  client.games.add(file);
}

client.on('ready', () => {
  console.log('ready');
});

client.on('message', (msg) => {
  if (!msg.member || !msg.member.id || msg.member.user.bot) return;
  var e = client.events.get('message');
  for (var f of e) f(msg);
});

client.on('messageReactionAdd', (reaction, user) => {
  var e = client.events.get('messageReactionAdd');
  for (var f of e) f(reaction, user);
});

client.login(config.token);
