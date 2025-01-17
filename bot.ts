import express from 'express';
import TelegramBot = require('node-telegram-bot-api');
import * as schedule from 'node-schedule';
import moment = require('moment-timezone');
import * as fs from 'fs';
import * as path from 'path';
import bodyParser from 'body-parser';

// Express setup
const app = express();
app.use(bodyParser.json());

// Environment variables
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN || '6243200710:AAGt5dLvjobPFCgj2K9hRQi0g8gote3gRQ0';
const timeZone = 'Africa/Algiers';
const isDevelopment = process.env.NODE_ENV === 'development';
const url = process.env.APP_URL || 'https://your-app.onrender.com';

// Interface for user data
interface UserData {
    startDate: string;
    chatId: number;
}

// Data storage setup
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Bot initialization based on environment
let bot: TelegramBot;

if (isDevelopment) {
    // Use polling for development
    bot = new TelegramBot(token, { polling: true });
    console.log('Bot started in development mode (polling)');
} else {
    // Use webhooks for production
    bot = new TelegramBot(token, { webHook: { port } });
    bot.setWebHook(`${url}/webhook/${token}`);
    console.log('Bot started in production mode (webhook)');
}

// Express routes
app.get('/', (req, res) => {
    res.send('100 Days Challenge Bot is running!');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        mode: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString()
    });
});

// Webhook route for production
app.post(`/webhook/${token}`, (req, res) => {
    bot.handleUpdate(req.body, res);
    res.sendStatus(200);
});

// Helper functions
function loadUsers(): { [key: number]: UserData } {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveUsers(users: { [key: number]: UserData }): void {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function sendDailyReport(chatId: number) {
    const users = loadUsers();
    const userData = users[chatId];
    
    if (userData) {
        const startDate = moment(userData.startDate);
        const currentDay = moment().tz(timeZone).diff(startDate, 'days') + 1;
        const daysLeft = Math.max(0, 100 - currentDay);

        if (currentDay <= 100) {
            await bot.sendMessage(chatId, `
📊 تقرير اليوم ${currentDay}:

• اليوم رقم: ${currentDay}/100
• المتبقي: ${daysLeft} يوم
• نسبة الإنجاز: ${Math.min(100, Math.round((currentDay/100) * 100))}%

💪 أحسنت! لقد أكملت يوماً آخر من التحدي.
            `);
        } else {
            await bot.sendMessage(chatId, "🎉 مبروك! لقد أكملت تحدي 100 يوم!");
            // Optionally remove user from tracking after completion
            delete users[chatId];
            saveUsers(users);
        }
    }
}

// Bot commands
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const users = loadUsers();
    
    users[chatId] = {
        startDate: moment().tz(timeZone).format(),
        chatId: chatId
    };
    saveUsers(users);

    await bot.sendMessage(chatId, `
🌟 مرحباً بك في تحدي 100 يوم! 
تم تسجيل بداية تحديك. سأرسل لك تقريراً يومياً عن تقدمك.
    `);
});

// Schedule daily reports
schedule.scheduleJob('0 22 * * *', { tz: timeZone }, async () => {
    const users = loadUsers();
    for (const chatId in users) {
        try {
            await sendDailyReport(Number(chatId));
        } catch (error) {
            console.error(`Error sending report to ${chatId}:`, error);
        }
    }
});

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`Timezone: ${timeZone}`);
});