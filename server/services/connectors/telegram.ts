import axios from 'axios'

export async function sendViaTelegram(message: string): Promise<void> {
  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken
  const chatId = config.telegramChatId

  if (botToken && chatId) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  } else {
    console.warn('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are not defined.')
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export async function sendMessagesViaTelegram(messages: string[], chunkSize = 10, title = ''): Promise<void> {
  const chunks = chunkArray(messages, chunkSize)
  let i = 1
  for (const chunk of chunks) {
    const message = `${title} - page ${i}\n${chunk.join('\n\n')}`
    await sendViaTelegram(message)
    i++
  }
}
