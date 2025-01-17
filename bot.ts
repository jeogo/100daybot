import TelegramBot = require("node-telegram-bot-api");
import * as schedule from "node-schedule";
import moment = require("moment-timezone");
import * as fs from "fs";
import * as path from "path";
import express, { Request, Response } from "express";

interface UserData {
    startDate: string;
    chatId: number;
}

// Express server setup
const app = express();
const port = process.env.PORT || 3000;

// Add a basic health check endpoint
app.get('/', (_req: Request, res: Response) => {
    res.send('Bot server is running!');
});

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy' });
});

// Configuration
const token = process.env.TELEGRAM_BOT_TOKEN || "6243200710:AAGt5dLvjobPFCgj2K9hRQi0g8gote3gRQ0";
const timeZone = "Africa/Algiers";

// Initialize bot with webhook in production, polling in development
const isDevelopment = process.env.NODE_ENV === 'development';
const bot = new TelegramBot(token, {
    webHook: !isDevelopment
});

// Set webhook for production environment
if (!isDevelopment) {
    const url = process.env.APP_URL || "https://your-render-url.onrender.com";
    bot.setWebHook(`${url}/webhook/${token}`);
    
    // Handle webhook endpoint
    app.post(`/webhook/${token}`, (req: { body: any; }, res: any) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });
}

// Data storage
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Helper functions for user data persistence
function loadUsers(): { [key: number]: UserData } {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function saveUsers(users: { [key: number]: UserData }): void {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Start command
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

// Function to send daily report
async function sendDailyReport(chatId: number) {
    const users = loadUsers();
    const userData = users[chatId];
    
    if (userData) {
        const startDate = moment(userData.startDate);
        const currentDay = moment().tz(timeZone).diff(startDate, "days") + 1;
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
        }
    }
}

// Schedule daily report (at 10 PM)
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
bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
});

// Start Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});