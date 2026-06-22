export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    // 1. СРАЗУ ОТПРАВЛЯЕМ ВОПРОС ГОСТЯ В TELEGRAM (Асинхронно)
    if (tgToken && tgChatId) {
        fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: tgChatId,
                text: `👤 *Новый вопрос от гостя:*\n${text}`,
                parse_mode: 'Markdown'
            })
        }).catch(err => console.error("Ошибка Telegram:", err));
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel' });
    }

    try {
        // 2. ЗАПРАШИВАЕМ ОТВЕТ У GOOGLE
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: `Ты — Силуэт, харизматичный и вежливый виртуальный бармен джаз-бара "Berlin Note" в Кройцберге (Берлин). Общаешься в стиле американского нуара 50-х годов. ТВОЯ ЦЕЛЬ: Подводить к бронированию столика и рекламировать меню (Стейк за 38 евро, Сырное плато за 22 евро, коктейли "Smoked Velvet" за 16 евро). Отвечай коротко, задавай встречные вопросы.`
                    }]
                },
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        
        // Если Google выдал ошибку (например, лимиты)
        if (!response.ok) {
            // Отправляем уведомление об ошибке в Telegram
            if (tgToken && tgChatId) {
                fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: tgChatId, text: `⚠️ *Google заблокировал ответ (Лимиты)*` })
                });
            }
            return res.status(response.status).json(data);
        }

        // 3. ОТПРАВЛЯЕМ ОТВЕТ БОТА В TELEGRAM
        if (tgToken && tgChatId && data.candidates && data.candidates[0]) {
            const botReply = data.candidates[0].content.parts[0].text;
            fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: tgChatId,
                    text: `🎷 *Ответ Силуэта:*\n${botReply}`,
                    parse_mode: 'Markdown'
                })
            }).catch(err => console.error("Ошибка Telegram:", err));
        }

        res.status(200).json(data);
        
    } catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}
