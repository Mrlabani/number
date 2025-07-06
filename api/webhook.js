import { Telegraf } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { extractNumbers } from '../utils/numberUtils.js';
import { simulateProgress } from '../utils/progress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Telegraf(BOT_TOKEN);
const TMP = '/tmp';

bot.start((ctx) => {
  ctx.reply('👋 Upload a `.txt`, `.xlsx` file or type numbers (1 per line).');
});

bot.on('text', async (ctx) => {
  const numbers = extractNumbers(ctx.message.text);
  if (numbers.length === 0) return ctx.reply('❌ No valid phone numbers found.');

  if (numbers.length > 50) await simulateProgress(ctx, numbers.length);

  const filePath = path.join(TMP, `numbers-${Date.now()}`);
  fs.writeFileSync(`${filePath}.txt`, numbers.join('\n'));

  const ws = XLSX.utils.aoa_to_sheet(numbers.map((n) => [n]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Numbers');
  XLSX.writeFile(wb, `${filePath}.xlsx`);

  await ctx.replyWithDocument({ source: `${filePath}.txt`, filename: 'numbers.txt' });
  await ctx.replyWithDocument({ source: `${filePath}.xlsx`, filename: 'numbers.xlsx' });

  fs.unlinkSync(`${filePath}.txt`);
  fs.unlinkSync(`${filePath}.xlsx`);
});

bot.on('document', async (ctx) => {
  const file = ctx.message.document;
  const ext = path.extname(file.file_name).toLowerCase();
  const fileUrl = await ctx.telegram.getFileLink(file.file_id);
  const buffer = (await axios.get(fileUrl.href, { responseType: 'arraybuffer' })).data;

  const tempPath = path.join(TMP, `input-${Date.now()}`);
  fs.writeFileSync(`${tempPath}${ext}`, buffer);

  let numbers = [];

  if (ext === '.txt') {
    const text = fs.readFileSync(`${tempPath}.txt`, 'utf-8');
    numbers = extractNumbers(text);
  } else if (ext === '.xlsx') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    numbers = data.flat().map((n) => `${n}`.trim()).filter((n) => /^\+?\d{7,15}$/.test(n) && n !== '+92919982882');
  } else {
    return ctx.reply('❌ Only .txt or .xlsx files allowed.');
  }

  if (numbers.length === 0) return ctx.reply('❌ No valid phone numbers found.');
  if (numbers.length > 50) await simulateProgress(ctx, numbers.length);

  fs.writeFileSync(`${tempPath}.txt`, numbers.join('\n'));
  const ws = XLSX.utils.aoa_to_sheet(numbers.map((n) => [n]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Numbers');
  XLSX.writeFile(wb, `${tempPath}.xlsx`);

  await ctx.replyWithDocument({ source: `${tempPath}.txt`, filename: 'numbers.txt' });
  await ctx.replyWithDocument({ source: `${tempPath}.xlsx`, filename: 'numbers.xlsx' });

  fs.unlinkSync(`${tempPath}${ext}`);
  fs.unlinkSync(`${tempPath}.txt`);
  fs.unlinkSync(`${tempPath}.xlsx`);
});

// Export handler for Vercel
export default async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Bot Error');
  }
};
