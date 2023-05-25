const { ActivityType } = require("discord.js");
const client = require("..");
const chalk = require("chalk");

client.on("ready", () => {
	const activities = [
		{ name: `coded whispers`, type: ActivityType.Listening },
		{ name: `the chaos unfold`, type: ActivityType.Watching },
		{ name: `the underbelly's dance`, type: ActivityType.Watching },
		{ name: `the echoes of embezzled wealth`, type: ActivityType.Listening },
		{ name: `the encrypted symphony`, type: ActivityType.Listening },
		{ name: `the seeds of bribery take root`, type: ActivityType.Watching },
	];

	let i = 0;
	setInterval(() => {
		if (i >= activities.length) i = 0;
		client.user.setActivity(activities[i]);
		i++;
	}, 5000);

	let s = 0;
	setInterval(() => {
		if (s >= activities.length) s = 0;
		client.user.setStatus("dnd");
		s++;
	}, 30000);
	console.log(chalk.red(`Logged in as ${client.user.tag}!`));
});