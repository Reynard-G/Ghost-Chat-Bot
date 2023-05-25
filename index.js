const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction]
});
const fs = require('fs');
const log = require('./utils/logger');
require('dotenv').config();

client.aliases = new Collection();
client.slashCommands = new Collection();
client.subCommands = new Collection();
client.buttons = new Collection();
client.logger = log;

module.exports = client;

fs.readdirSync('./handlers').forEach((handler) => {
	require(`./handlers/${handler}`)(client);
});

fs.readdirSync('./utils').forEach((manager) => {
	if (!fs.lstatSync(`./utils/${manager}`).isDirectory()) return;
	fs.readdirSync(`./utils/${manager}`).forEach((file) => {
		client[manager] = new (require(`./utils/${manager}/${file}`))(client);
	});
});

fs.readdirSync('./utils').forEach((classes) => {
	if (fs.lstatSync(`./utils/${classes}`).isDirectory() || classes === "logger.js") return;
	client[classes] = require(`./utils/${classes}`);
});

process.on('unhandledRejection', (error) => {
	log.warn("An unhandled rejection occurred.");
	if (error instanceof Error) log.warn(`Uncaught ${error.name}`);
	log.warn(error);
});

client.login(process.env.TOKEN);
