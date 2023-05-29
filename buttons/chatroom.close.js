const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	id: "chatroom.close",
	permissions: [],
	run: async (client, interaction) => {
		// Defer reply to prevent interaction timeout
		await interaction.deferReply();

		// If the interaction is in a DM, the interaction is from the creator
		// Otherwise, use the chatroom channel ID to get the creator ID
		const creatorID = !interaction.inGuild() ? interaction.user.id : await client.chatrooms.creator(interaction.channelId);
		const chatroomObj = (await client.chatrooms.get(creatorID, "creator"))[0];
		const chatroomID = chatroomObj.id;

		// Close the chatroom
		const res = await client.chatrooms.close(chatroomID);
		if (!res) {
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Chatroom Close Failed")
						.setDescription("This chatroom has already been closed.")
						.setColor("Red")
						.setTimestamp()
						.setFooter({ text: "Ghost Chat", iconURL: client.user.displayAvatarURL() })
				]
			});

			return;
		}

		// Reply to the interaction
		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle("Chatroom Closed")
					.setDescription("This chatroom has been closed. The channel will be deleted in 10 seconds and a transcript will be sent to your DMs.")
					.setColor("8B0000")
					.setTimestamp()
					.setFooter({ text: "Ghost Chat", iconURL: client.user.displayAvatarURL() })
			]
		});
	}
};
