export async function simulateProgress(ctx, total, steps = 5) {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  let message = await ctx.reply('📦 Separating numbers...');
  for (let i = 1; i <= steps; i++) {
    const percent = Math.floor((i / steps) * 100);
    await delay(400);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message.message_id,
      undefined,
      `🔢 Progress: ${percent}%`
    );
  }
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    message.message_id,
    undefined,
    `✅ Done! Sending files...`
  );
}
