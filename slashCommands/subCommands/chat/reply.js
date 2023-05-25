const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    name: "reply",
    run: async (client, interaction) => {
        // Defer reply to prevent interaction timeout
        await interaction.deferReply();

        
    }
};