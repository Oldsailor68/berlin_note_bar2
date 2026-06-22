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

    // 1. СРАЗУ ОТПРАВЛЯЕМ ВОПРОС ГОСТЯ В TELEGRAM (Теперь с await!)
    if (tgToken && tgChatId) {
        try {
            await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: tgChatId,
                    text: `👤 *Новый вопрос от гостя:*\n${text}`,
                    parse_mode: 'Markdown'
                })
            });
        } catch (err) {
            console.error("Ошибка отправки в Telegram:", err);
        }
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
                        text: `Ты — Силуэт, харизматичный и вежливый виртуальный бармен джаз-бара "Berlin Note" в Кройцберге (Берлин). Общаешься в стиле американского нуара 50-х годов: лаконично, с легкой загадкой, но безупречно вежливо.

ТВОЯ ГЛАВНАЯ ЦЕЛЬ: Подводить каждого гостя к бронированию столика и рекламировать дорогие позиции меню. Ты не просто болтаешь, ты — продавец атмосферы.

ТЕХНИКИ ПРОДАЖ (ОБЯЗАТЕЛЬНО К ИСПОЛЬЗОВАНИЮ):
1. Инициатива в диалоге: Никогда не заканчивай свой ответ просто точкой. Всегда задавай встречный вопрос (например: "Желаете, я расскажу, как забронировать столик?", "Какой алкоголь вы предпочитаете?").
2. Кросс-сейл и Апсейл: Если гость спрашивает про музыку, обязательно предложи коктейль. Если спрашивает про напитки, посоветуй горячее. Фокусируйся на дорогих позициях (Стейк Рибай за €38, Утиная грудка за €26, "Smoked Velvet" за €16).
3. Создание ажиотажа: Ненавязчиво напоминай, что на Гранд-открытие 14 октября 2026 года и концерты столики резервируют очень быстро.
4. Призыв к действию (CTA): Если гость хочет забронировать стол, четко скажи ему: "Просто закройте этот чат и прокрутите страницу чуть ниже до формы 'Резерв столика'".

БАЗА ЗНАНИЙ (МЕНЮ И ФАКТЫ):
- Гранд-открытие: 14 октября 2026 года в 19:00.
- Адрес: Kreuzberg, 10999 Berlin, Germany.
- Коктейли: "Midnight Express" (€14), "Smoked Velvet" (€16), "Jazz Age Tonic" (€12), "Noir Negroni" (€15), "Golden Sax" (€13), "Blue Note" (€14).
- Еда: Говяжий тартар с трюфелем (€18), Сырное плато Noir (€22), Стейк Рибай (€38), Брускетты с лососем (€14), Утиная грудка Магре (€26), Шоколадный фондан (€10).

ОГРАНИЧЕНИЯ:
- Не придумывай блюда и акции, которых нет в базе знаний.
- Отвечай коротко, не более 2-3 абзацев. Люди не любят читать длинные тексты.
- Подстраивайся под язык пользователя (отвечай на русском, немецком или английском).`
                    }]
                },
                contents: [{ parts: [{ text: text }] }]
            })
        });

        const data = await response.json();
        
        // Если Google выдал ошибку (лимиты)
        if (!response.ok) {
            if (tgToken && tgChatId) {
                await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: tgChatId, 
                        text: `⚠️ *Google просит подождать минуту (Лимит квоты)*`,
                        parse_mode: 'Markdown'
                    })
                });
            }
            return res.status(response.status).json(data);
        }

        // 3. ОТПРАВЛЯЕМ ОТВЕТ БОТА В TELEGRAM (Тоже с await)
        if (tgToken && tgChatId && data.candidates && data.candidates[0]) {
            const botReply = data.candidates[0].content.parts[0].text;
            try {
                await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: tgChatId,
                        text: `🎷 *Силуэт:*\n${botReply}`,
                        parse_mode: 'Markdown'
                    })
                });
            } catch (err) {
                console.error("Ошибка Telegram:", err);
            }
        }

        res.status(200).json(data);
        
    } catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}
