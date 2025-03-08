import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sectionContent, sectionName } = req.body;

    if (!sectionContent) {
      return res.status(400).json({ 
        error: 'No content provided' 
      });
    }

    console.log('Processing request for section:', sectionName);
    console.log('Content:', sectionContent);

    const prompt = `Please improve this ${sectionName}. First provide your explanation, then provide ONLY the improved text between <suggestion></suggestion> tags.\n\nCurrent text: "${sectionContent}"`;

    const completion = await openai.chat.completions.create({
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

    const response = completion.choices[0].message.content;
    console.log('OpenAI response:', response);

    res.status(200).json({ response });
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Send more detailed error information
    res.status(500).json({ 
      error: 'Error processing your request',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
} 