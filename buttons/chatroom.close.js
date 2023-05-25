//const { verifyRole } = require("../config.json");

module.exports = {
	id: "chatroom.close",
	permissions: [],
	run: async (client, interaction) => {
		// Defer reply to prevent interaction timeout
		await interaction.deferReply();

		// Check if the interaction is in the bot's DMs
		if (interaction.inGuild()) {
			console.log("Mod is closing chatroom")
		} else {
			console.log("User is closing chatroom")
		}

		// 
	}
};
