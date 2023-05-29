const { EmbedBuilder } = require("discord.js");

module.exports = {
    id: "reply.modal",
    permissions: [],
    run: async (client, interaction) => {
        // Defer reply to prevent interaction timeout
        await interaction.deferReply();

        // Get the message input
        const message = await interaction.fields.getTextInputValue("replyInput");

        // If the interaction is in a DM, the interaction is from the creator
        // Otherwise, use the chatroom channel ID to get the creator ID
        const creatorID = !interaction.inGuild() ? interaction.user.id : await client.chatrooms.creator(interaction.channelId);

        // Check if chatroom exists
        const chatroom = await client.chatrooms.get(creatorID, "creator");

        if (!chatroom) {
            client.logger.warn(`Tried to reply to chatroom ${chatroom}, but it does not exist.`);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Chatroom Does Not Exist")
                        .setDescription("The chatroom you are trying to send a message to does not exist. Please try again.")
                        .setColor("Red")
                        .setTimestamp()
                        .setFooter({ text: "Ghost Chat", iconURL: client.user.displayAvatarURL() })
                ]
            });

            // Delete message after 10 seconds
            await new Promise((resolve) => setTimeout(resolve, 10000));
            await interaction.deleteReply();

            return;
        }

        const chatroomID = await client.chatrooms.get(creatorID, "creator");

        // If the interaction is in a guild, the message is anonymous
        // If there is a DM interaction, the message is from the creator and not anonymous
        const isAnonymous = interaction.inGuild() ? true : false;

        await client.chatrooms.reply(chatroomID[0].id, interaction.user.id, message, isAnonymous);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Message Sent")
                    .setDescription("Your message has been successfully sent.")
                    .setColor("Green")
                    .setTimestamp()
                    .setFooter({ text: "Ghost Chat", iconURL: client.user.displayAvatarURL() })
            ]
        });

        // Delete message after 1 seconds
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await interaction.deleteReply();
    }
};