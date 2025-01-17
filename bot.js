"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TelegramBot = require("node-telegram-bot-api");
const schedule = __importStar(require("node-schedule"));
const moment = require("moment-timezone");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
// Configuration
const token = process.env.TELEGRAM_BOT_TOKEN || "6243200710:AAGt5dLvjobPFCgj2K9hRQi0g8gote3gRQ0";
const RAPIDAPI_KEY = "4c1ff8bf1dmsh10ba64858a49586p11d7d7jsnaccf0345d600";
const timeZone = "Africa/Algiers";
// Initialize bot
const bot = new TelegramBot(token, { polling: true });
// Data storage
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
// Initialize or load users data
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}
// Save data function
const saveUsers = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users));
// Fallback quotes
const fallbackQuotes = [
    "بَسِّط الأمور المعقدة، ولا تُعقد الأمور البسيطة. وكن مُعتدلا في هذا وفي هذا، ودع الإفراط والتفريط.",
    "النجاح رحلة وليس وجهة.",
    "كل يوم هو فرصة جديدة للتقدم.",
    "الثبات على الطريق نصف النجاح.",
    "خطوة صغيرة كل يوم تؤدي إلى تغيير كبير."
];
// Main menu keyboard
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "📊 تقدمي" }, { text: "💪 رسالة تحفيزية" }],
            [{ text: "🔄 إعادة التحدي" }]
        ],
        resize_keyboard: true
    }
};
// Start command
bot.onText(/\/start/, (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id.toString();
    users[chatId] = {
        startDate: moment().tz(timeZone).format(),
        day: 1
    };
    saveUsers();
    yield bot.sendMessage(chatId, `
🌟 مرحباً بك في تحدي 100 يوم! 🌟

سأكون معك في رحلتك نحو النجاح.
سأرسل لك رسائل تحفيزية يومياً وأساعدك في تتبع تقدمك.

استخدم الأزرار أدناه للتفاعل معي 👇
    `, mainKeyboard);
}));
// Handle menu buttons
bot.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (!msg.text)
        return;
    const chatId = msg.chat.id.toString();
    switch (msg.text) {
        case "📊 تقدمي":
            if (users[chatId]) {
                const startDate = moment(users[chatId].startDate);
                const currentDay = moment().tz(timeZone).diff(startDate, "days") + 1;
                const daysLeft = Math.max(0, 100 - currentDay);
                yield bot.sendMessage(chatId, `
📊 تقدمك في التحدي:
• اليوم رقم: ${currentDay}/100
• المتبقي: ${daysLeft} يوم
• نسبة الإنجاز: ${Math.min(100, Math.round((currentDay / 100) * 100))}%

💪 واصل التقدم!
                `);
            }
            break;
        case "data":
            yield sendMotivationalMessage(chatId);
            break;
        case "🔄 إعادة التحدي":
            users[chatId] = {
                startDate: moment().tz(timeZone).format(),
                day: 1
            };
            saveUsers();
            yield bot.sendMessage(chatId, "✨ تم إعادة تشغيل التحدي! ابدأ رحلتك من جديد.");
            break;
    }
}));
// Function to send motivational message
function sendMotivationalMessage(chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield (0, axios_1.default)({
                method: 'GET',
                url: 'https://dr-almotowa-quotes.p.rapidapi.com/getRandomQuote',
                params: { limit: '1' },
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'dr-almotawa-quotes.p.rapidapi.com'
                }
            });
            // اطبع البيانات المستلمة للتحقق منها
            console.log('API Response:', response.data);
            // تعامل مع البيانات المستلمة بشكل صحيح
            let quote = '';
            if (Array.isArray(response.data) && response.data.length > 0) {
                // إذا كانت البيانات مصفوفة
                quote = response.data[0].quote || response.data[0].text;
            }
            else if (response.data.wisdom) {
                // إذا كانت البيانات تحتوي على كائن wisdom
                quote = response.data.wisdom.text;
            }
            else if (response.data.quote) {
                // إذا كانت البيانات تحتوي على حقل quote مباشرة
                quote = response.data.quote;
            }
            // إذا لم نجد اقتباساً، استخدم الاقتباسات الاحتياطية
            if (!quote) {
                quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            }
            yield bot.sendMessage(chatId, `💭 ${quote}`);
        }
        catch (error) {
            console.error('Error fetching quote:', error);
            // استخدم اقتباس احتياطي في حالة الخطأ
            const fallbackQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            yield bot.sendMessage(chatId, `💭 ${fallbackQuote}`);
        }
    });
}
// Schedule daily messages (9 AM and 6 PM)
["9", "18"].forEach(hour => {
    schedule.scheduleJob(`0 ${hour} * * *`, { tz: timeZone }, () => __awaiter(void 0, void 0, void 0, function* () {
        for (const chatId in users) {
            try {
                yield sendMotivationalMessage(chatId);
            }
            catch (error) {
                console.error(`Error sending message to ${chatId}:`, error);
            }
        }
    }));
});
// Error handling
bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
});
console.log("Bot is running...");
