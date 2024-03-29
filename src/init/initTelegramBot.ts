process.env.NTBA_FIX_319 = String(1);
import TelegramBot from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_TOKEN;

if (!TOKEN) {
    console.error('You must set up the environment variable TELEGRAM_TOKEN to use the Telegram bot');
    process.exit(1);
}

export const initTelegramBot = () =>
    new TelegramBot(TOKEN, {polling: true});
