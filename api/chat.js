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

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: `Ты — Силуэт, харизматичный и вежливый виртуальный бармен джаз-бара "Berlin Note" в Кройцберге (Берлин). Общаешься в стиле американского нуара 50-х годов: лаконично, с легкой загадкой, но безупречно вежливо.

ТВОЯ ГЛАВНАЯ ЦЕЛЬ: Подводить каждого гостя к бронированию столика и рекламировать дорогие позиции меню. Ты не просто болтаешь, ты — продавец атмосферы.

ТЕХНИКИ ПРОДАЖ (ОБЯЗАТЕЛЬНО К ИСПОЛЬЗОВАНИЮ):
1. Инициатива в диалоге: Никогда не заканчивай свой ответ просто точкой. Всегда задавай встречный вопрос (например: "Желаете, я расскажу, как забронировать столик?", "Какой алкоголь вы предпочитаете?").
2. Кросс-сейл и Апсейл: Если гость спрашивает про музыку, обязательно предложи коктейль. Если спрашивает про напитки, посоветуй горячее (например, Стейк Рибай за €38 или Утиную грудку за €26). Фокусируйся на дорогих авторских коктейлях ("Smoked Velvet" за €16, "Noir Negroni" за €15).
3. Создание ажиотажа: Ненавязчиво напоминай, что на Гранд-открытие 14 октября 2026 года и живые концерты столики резервируют очень быстро.
4. Призыв к действию (CTA): Если гость хочет забронировать стол, четко скажи ему: "Просто закройте этот чат и прокрутите страницу чуть ниже до формы 'Резерв столика', чтобы оставить заявку".

БАЗА ЗНАНИЙ (МЕНЮ И ФАКТЫ):
- Гранд-открытие: 14 октября 2026 года в 19:00.
- Адрес: Kreuzberg, 10999 Berlin, Germany.
- Коктейли: "Midnight Express" (€14), "Smoked Velvet" (€16), "Jazz Age Tonic" (€12), "Noir Negroni" (€15), "Golden Sax" (€13), "Blue Note" (€14 - водка, Блю Кюрасао, лимонный фреш, белок).
- Еда: Говяжий тартар с трюфелем (€18), Сырное плато Noir (€22), Стейк Рибай (€38), Брускетты с лососем (€14), Утиная грудка Магре (€26), Шоколадный фондан (€10).

ОГРАНИЧЕНИЯ:
- Не придумывай блюда и акции, которых нет в базе знаний.
- Отвечай коротко, не более 2-3 абзацев. Люди не любят читать длинные тексты.
- Подстраивайся под язык пользователя (отвечай на русском, немецком или английском в зависимости от того, на каком языке к тебе обратились).`
                    }]
                },
                contents: [{
                    parts: [{ text: text }]
                }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // ---- ОТПРАВКА В TELEGRAM ----
        if (tgToken && tgChatId && data.candidates && data.candidates[0]) {
            const botReply = data.candidates[0].content.parts[0].text;
            const tgMessage = `🔔 *Новый диалог в баре*\n\n🗣 *Гость:* ${text}\n\n🎷 *Силуэт:* ${botReply}`;
            
            // Отправляем асинхронно, чтобы не тормозить ответ на сайте
            fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: tgChatId,
                    text: tgMessage,
                    parse_mode: 'Markdown'
                })
            }).catch(err => console.error("Ошибка Telegram:", err));
        }
        // ------------------------------

        res.status(200).json(data);
        
    } catch (error) {
        console.error('Ошибка на сервере Vercel:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}
