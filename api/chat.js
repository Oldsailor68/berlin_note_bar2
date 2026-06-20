export default function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    return res.status(200).json({ response: `Сервер принял сообщение: ${message}` });
  }
  return res.status(405).json({ message: 'Method Not Allowed' });
}
