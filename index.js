require('dotenv').config();
const path = require('path');
const { Telegraf } = require('telegraf');
const { handlePlayerCommand } = require('./services/player');
const { handleWarCommand } = require('./services/war');
const { handleClanCommand } = require('./services/clan');
const { handleGoldPassCommand } = require('./services/goldpass');
const moment = require('moment');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

function getMoment() {
    return moment().format('DD-MM-YYYY - HH:mm:ss');
}

const welcomeMessage = (firstName) => [
    `Bem-vindo(a) *${firstName}*!`,
    "Eu sou o *Clash Lumni*, seu assistente pessoal para tudo sobre Clash of Clans!",
    "Digite */comandos* para ver as opções de comandos."
].join("\n");

/* 
start - Mensagem de boas vindas.
comandos - Todos os comandos disponíveis podem ser encontrados aqui.
jogador - Obtenha informações detalhadas sobre o perfil de um jogador.
clan - Obtenha informações gerais sobre um clã.
guerra - Obtenha informações sobre a guerra atual de um clã.
bilhete - Obtenha informações sobre o bilhete dourado atual.
tutorial - Imagem tutorial para conseguir a Tag, que serão utilizadas nos comandos.
*/

const menu = [
    "*### Comandos ###*\n",
    "*/comandos* \nTodos os comandos disponíveis podem ser encontrados aqui.\n",
    "*/jogador <tag do jogador>* \nObtenha informações detalhadas sobre o perfil de um jogador.\n",
    "*/clan <tag do clã>* \nObtenha informações gerais sobre um clã.\n",
    "*/guerra* <tag do clã> \nObtenha informações sobre a guerra atual de um clã.\n",
    "*/bilhete* \nObtenha informações sobre o bilhete dourado atual\n",
    "*/tutorial* \nImagem tutorial para conseguir a Tag, que serão utilizadas nos comandos.",
].join("\n");

bot.on("message", async (ctx) => {
    try {
        const userId = ctx.from.id;
        let now = Date.now();
        const chatId = ctx.chat.id;
        console.log('Chat id: ' + chatId);

        if (
            ctx.message.photo || 
            (ctx.message.video && !ctx.message.video_note) ||
            (ctx.message.audio && !ctx.message.voice) ||
            ctx.message.entities?.some(entity => entity.type === 'url' || entity.type === 'text_link') || 
            ctx.message.location || 
            ctx.message.contact || 
            ctx.message.document || 
            ctx.message.sticker ||
            ctx.message.venue
        ) {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            await ctx.reply(`⚠️ *${ctx.from.first_name}* - Não é permitido enviar imagens, vídeos (exceto notas de vídeo), áudios (exceto mensagens de voz), links, localizações, carteiras, arquivos, enquetes ou contatos.`, { parse_mode: "Markdown" });
            return;
        }

        if (ctx.message.new_chat_members) {
            const newMembers = ctx.message.new_chat_members;
            for (const member of newMembers) {
                if (!member.is_bot) {
                    await ctx.reply(`Bem-vindo(a) ao grupo, *${member.first_name}*! Digite /comandos para ver as opções.`);
                }
            }
            return;
        }

        if (ctx.message.left_chat_member) {
            return;
        }

        const messageText = ctx.message.text?.trim().replace(/@[\w\d_]+/g, "").trim();
        const command = messageText ? messageText.split(" ")[0].toLowerCase() : '';

        if (messageText && !messageText.startsWith("/")) {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
            await ctx.reply(welcomeMessage(ctx.from.first_name), { parse_mode: "Markdown" });
            return;
        }

        switch (command) {
            case "/start":
                await ctx.reply(welcomeMessage(ctx.from.first_name), { parse_mode: "Markdown" });
                console.log(`[${getMoment()}] ${ctx.from.first_name}: /start`);
                break;

            case "/comandos":
                await ctx.reply(menu, { parse_mode: "Markdown" });
                console.log(`[${getMoment()}] ${ctx.from.first_name}: /comandos`);
                break;

            case "/jogador":
                await handlePlayerCommand(ctx);
                break;

            case "/guerra":
                await handleWarCommand(ctx);
                break;

            case "/clan":
                await handleClanCommand(ctx);
                break;

            case "/bilhete":
                await handleGoldPassCommand(ctx);
                break;

            case "/tutorial":
                const imagePath = path.join(__dirname, 'images', 'tutorial.jpg');
                let tutorialMessage = `*${ctx.from.first_name}*, aqui está o tutorial para encontrar sua Tag! Depois, use */comandos* para explorar as opções.`;                
                await ctx.replyWithPhoto({ source: imagePath }, {
                    caption: tutorialMessage,
                    parse_mode: "Markdown"
                });
                console.log(`[${getMoment()}] ${ctx.from.first_name}: /tutorial`);
                break;

            default:
                await ctx.reply(`⚠️ Comando desconhecido. Use */comandos* para ver as opções disponíveis.`, { parse_mode: "Markdown" });
                break;
        }
    } catch (error) {
        console.error(`[${getMoment()}] Erro ao processar comando: ${error.message}`, error);
        await ctx.reply('❌ Ocorreu um erro ao processar seu comando. Tente novamente mais tarde.');
    }
});

// Ads
let lastMessageId = null;
const multiply = 3;
const sendInterval = 300000 * multiply; // 5 minutos * X
const deleteInterval = 240000 * multiply; // 4 minutos * X

async function sendAndScheduleDelete() {
    const imagePath = path.join(__dirname, 'images', 'loo9.jpg');
    const caption = `_Propaganda Automática (15 min)_\n\n*Precisando de automações?*\nhttps://loo9.com.br/`;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    try {
        const sentMessage = await bot.telegram.sendPhoto(chatId, { source: imagePath }, { caption, parse_mode: "Markdown" });
        console.log(`[${getMoment()}] Imagem promocional enviada com sucesso.`);
        lastMessageId = sentMessage.message_id;

        setTimeout(async () => {
            if (lastMessageId) {
                try {
                    await bot.telegram.deleteMessage(chatId, lastMessageId);
                    console.log(`[${getMoment()}] Imagem promocional excluída.`);
                } catch (error) {
                    console.error(`[${getMoment()}] Erro ao excluir a mensagem: ${error.message}`, error);
                }
            }
        }, deleteInterval);
    } catch (error) {
        console.error(`[${getMoment()}] Erro ao enviar a imagem: ${error.message}`, error);
    }
}

sendAndScheduleDelete();
setInterval(sendAndScheduleDelete, sendInterval);

async function getExternalIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error(`[${getMoment()}] Erro ao obter IP externo: ${error.message}`, error);
        return 'IP externo não disponível';
    }
}

async function startBot() {
    try {
        const externalIP = await getExternalIP();
        console.log(`[${getMoment()}] Bot em execução. IP externo: ${externalIP}`);
        bot.launch();
    } catch (err) {
        console.error(`[${getMoment()}] Erro ao iniciar o bot: ${err.message}`, err);
        process.exit(1);
    }
}

startBot();

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${getMoment()}] Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
    console.error(`[${getMoment()}] Uncaught Exception thrown: ${error.message}`, error);
    process.exit(1);
});