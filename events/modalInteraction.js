const { EmbedBuilder, InteractionType } = require("discord.js");
const client = require("..");

client.on("interactionCreate", async interaction => {
    try {
        if (interaction.isModalSubmit()) {
            if (interaction.user.bot) return;

            if (interaction.type !== InteractionType.ModalSubmit) return;

            const command = client.modals.get(interaction.customId);
            if (!command) {
                interaction.reply({
                    ephemeral: true,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setTitle(`Failed To Execute Modals!`)
                            .setDescription(`I can't execute the modal for you.`)
                            .setTimestamp()
                            .setFooter({ text: `FAILED MODAL`, iconURL: interaction.guild.iconURL() })
                    ]
                });
            } else {
                command.run(client, interaction);
            }
        }
    } catch (error) {
        client.logger.error(error);
    }
});