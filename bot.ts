import TelegramBot = require("node-telegram-bot-api");
import * as schedule from "node-schedule";
import moment = require("moment-timezone");
import * as fs from "fs";
import * as path from "path";

interface DailyReport {
  date: string;
  achievements: string;
  day: number;
}

interface UserData {
  startDate: string;
  chatId: number;
  reports: DailyReport[];
  currentPage: number;
}

// Configuration
const token =
  process.env.TELEGRAM_BOT_TOKEN ||
  "6243200710:AAGt5dLvjobPFCgj2K9hRQi0g8gote3gRQ0";
const timeZone = "Africa/Algiers";
const REPORTS_PER_PAGE = 5;

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

// Data storage
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Helper functions for user data persistence
function loadUsers(): { [key: number]: UserData } {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function saveUsers(users: { [key: number]: UserData }): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getDayNumber(startDate: string): number {
  return moment().tz(timeZone).diff(moment(startDate), "days") + 1;
}

// Keyboard generators
function getMainKeyboard() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "📝 تسجيل إنجاز اليوم" }],
        [{ text: "📊 سجل التقارير" }, { text: "📈 ملخص التقدم" }],
      ],
      resize_keyboard: true,
    },
  };
}

function getReportNavigationKeyboard(currentPage: number, totalPages: number) {
  const buttons: any[][] = [];
  const navigationRow = [];

  if (currentPage > 1) {
    navigationRow.push({
      text: "⬅️ السابق",
      callback_data: `page_${currentPage - 1}`,
    });
  }

  navigationRow.push({
    text: `📄 ${currentPage}/${totalPages}`,
    callback_data: "current_page",
  });

  if (currentPage < totalPages) {
    navigationRow.push({
      text: "➡️ التالي",
      callback_data: `page_${currentPage + 1}`,
    });
  }

  buttons.push(navigationRow);
  buttons.push([
    {
      text: "🔄 العودة للقائمة الرئيسية",
      callback_data: "main_menu",
    },
  ]);

  return {
    reply_markup: {
      inline_keyboard: buttons,
    },
  };
}

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const users = loadUsers();
  users[chatId] = {
    startDate: moment().tz(timeZone).format(),
    chatId: chatId,
    reports: [],
    currentPage: 1,
  };
  saveUsers(users);

  await bot.sendMessage(
    chatId,
    `
🌟 مرحباً بك في نظام تتبع الإنجازات اليومية! 

سأساعدك في:
• تسجيل إنجازاتك اليومية
• متابعة تقدمك
• عرض سجل تقاريرك السابقة

استخدم الأزرار أدناه للبدء 👇
    `,
    getMainKeyboard()
  );
});

// Handle text messages
bot.on("message", async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;
  const users = loadUsers();
  const user = users[chatId];

  if (!user) {
    await bot.sendMessage(chatId, "الرجاء بدء البوت باستخدام الأمر /start");
    return;
  }

  switch (msg.text) {
    case "📝 تسجيل إنجاز اليوم":
      await bot.sendMessage(
        chatId,
        "ما هي إنجازاتك لهذا اليوم؟ اكتب تفاصيل ما قمت به.",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );
      break;

    case "📊 سجل التقارير":
      await showReportHistory(chatId, 1);
      break;

    case "📈 ملخص التقدم":
      await showProgressSummary(chatId);
      break;

    default:
      if (
        msg.reply_to_message?.text ===
        "ما هي إنجازاتك لهذا اليوم؟ اكتب تفاصيل ما قمت به."
      ) {
        await saveReport(chatId, msg.text);
      }
  }
});

// Handle callback queries (pagination)
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId || !query.data) return;

  if (query.data.startsWith("page_")) {
    const page = parseInt(query.data.split("_")[1]);
    await showReportHistory(chatId, page);
  } else if (query.data === "main_menu") {
    await bot.sendMessage(chatId, "القائمة الرئيسية:", getMainKeyboard());
  }

  await bot.answerCallbackQuery(query.id);
});

// Save daily report
async function saveReport(chatId: number, achievements: string) {
  const users = loadUsers();
  const user = users[chatId];

  const today = moment().tz(timeZone).format("YYYY-MM-DD");
  const existingReport = user.reports.find((r) => r.date === today);

  if (existingReport) {
    await bot.sendMessage(
      chatId,
      "لقد قمت بالفعل بتسجيل إنجازات اليوم. يمكنك تسجيل إنجازات جديدة غداً."
    );
    return;
  }

  const dayNumber = getDayNumber(user.startDate);
  user.reports.push({
    date: today,
    achievements,
    day: dayNumber,
  });

  saveUsers(users);

  await bot.sendMessage(
    chatId,
    `
✅ تم حفظ تقرير اليوم ${dayNumber} بنجاح!

📝 إنجازات اليوم:
${achievements}

واصل التقدم! 💪
    `
  );
}

// Show report history
async function showReportHistory(chatId: number, page: number) {
  const users = loadUsers();
  const user = users[chatId];

  if (user.reports.length === 0) {
    await bot.sendMessage(chatId, "لا توجد تقارير مسجلة بعد.");
    return;
  }

  const totalPages = Math.ceil(user.reports.length / REPORTS_PER_PAGE);
  const start = (page - 1) * REPORTS_PER_PAGE;
  const end = start + REPORTS_PER_PAGE;
  const pageReports = user.reports
    .sort((a, b) => moment(b.date).diff(moment(a.date)))
    .slice(start, end);

  let message = "📊 سجل التقارير:\n\n";
  pageReports.forEach((report) => {
    message += `📅 اليوم ${report.day} - ${moment(report.date).format(
      "DD/MM/YYYY"
    )}\n`;
    message += `📝 الإنجازات:\n${report.achievements}\n\n`;
  });

  await bot.sendMessage(
    chatId,
    message,
    getReportNavigationKeyboard(page, totalPages)
  );
}

// Show progress summary
async function showProgressSummary(chatId: number) {
  const users = loadUsers();
  const user = users[chatId];

  const dayNumber = getDayNumber(user.startDate);
  const daysLeft = Math.max(0, 100 - dayNumber);
  const completionRate = ((user.reports.length / dayNumber) * 100).toFixed(1);

  await bot.sendMessage(
    chatId,
    `
📈 ملخص التقدم:

• اليوم رقم: ${dayNumber}/100
• المتبقي: ${daysLeft} يوم
• عدد التقارير المسجلة: ${user.reports.length}
• نسبة الالتزام: ${completionRate}%
• نسبة الإنجاز: ${Math.min(100, Math.round((dayNumber / 100) * 100))}%

${dayNumber > 100 ? "🎉 مبروك! لقد أكملت التحدي!" : "💪 واصل التقدم!"}
    `
  );
}

// Error handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Bot is running...");
