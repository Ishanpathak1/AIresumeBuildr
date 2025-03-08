import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sectionContent, sectionName } = req.body;

    const prompt = `Please improve this ${sectionName}. First provide your explanation, then provide ONLY the improved text between <suggestion></suggestion> tags.\n\nCurrent text: "${sectionContent}"`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer helping to improve resumes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    const response = completion.data.choices[0].message.content;

    res.status(200).json({ response });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
} 