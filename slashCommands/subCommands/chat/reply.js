const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = {
    name: "reply",
    run: async (client, interaction) => {
        const replyModal = new ModalBuilder()
            .setTitle("Reply")
            .setCustomId("reply.modal");

        const messageInput = new TextInputBuilder()
            .setPlaceholder("Enter your message here...")
            .setCustomId("replyInput")
            .setStyle(TextInputStyle.Paragraph)
            .setLabel("Message")
            .setMinLength(1)
            .setRequired(true);

        const messageRow = new ActionRowBuilder()
            .addComponents(messageInput);

        replyModal.addComponents(messageRow);
        await interaction.showModal(replyModal);

        return;
    }
};