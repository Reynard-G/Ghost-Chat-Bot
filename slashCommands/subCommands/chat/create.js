const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: "create",
    run: async (client, interaction) => {
        // Defer reply to prevent interaction timeout
        await interaction.deferReply();

        // Check if the interaction is in the bot's DMs
        if (interaction.inGuild()) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Invalid Channel")
                        .setDescription("This command can only be used in DMs. Please try again in my DMs.")
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

        // Check if the user is already in a chatroom
        const chatroom = await client.chatrooms.get(interaction.user.id);
        if (chatroom !== null) {
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Already in Chatroom")
                        .setDescription("You are already in a chatroom. Please close your current chatroom before creating a new one.")
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

        // Create a new chatroom
        try {
            await client.chatrooms.create(process.env.CHATROOM_GUILD_ID, interaction.user.id, process.env.CHATROOM_CATEGORY_ID);

            const components = new ActionRowBuilder();
            components.addComponents(
                new ButtonBuilder()
                    .setCustomId("chatroom.close")
                    .setLabel("Close")
                    .setEmoji("🔒")
                    .setStyle(ButtonStyle.Danger)
            );

            const response = {
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Chatroom Created")
                        .setDescription(`Your chatroom has been created. Messages sent here will be relayed back to the recipients automatically. You can close the chatroom at any time by clicking the button below.`)
                        .setColor("#8B0000")
                        .setTimestamp()
                        .setFooter({ text: `Ghost Chat • Chatroom #`, iconURL: client.user.displayAvatarURL() })
                ],
                components: [components]
            };

            await interaction.editReply(response);
        } catch (error) {
            const response = {
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Unexpected Error")
                        .setDescription("An unexpected error occurred while creating your chatroom. Please try again later.")
                        .setColor("Red")
                        .setTimestamp()
                        .setFooter({ text: "Ghost Chat", iconURL: client.user.displayAvatarURL() })
                ]
            };

            client.logger.error(error);

            await interaction.editReply(response);
        }
    }
};