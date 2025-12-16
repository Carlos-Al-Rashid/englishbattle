import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function processImageWithGPT(base64Image: string): Promise<{ word: string, meaning: string }[]> {
    if (!API_KEY) {
        console.warn("OpenAI API Key not found.");
        throw new Error("API Key missing");
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Identify all English vocabulary words in this image and their corresponding Japanese meanings. If any word or meaning is unrecognizable, illegible, or appears to be nonsense, please reconstruct or correct it based on your knowledge to form a valid English-Japanese vocabulary pair. Output a JSON array of objects with "word" and "meaning" keys. Example: [{"word": "apple", "meaning": "りんご"}, ...]. Output ONLY the JSON.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );

        const content = response.data.choices[0].message.content;
        // Clean markdown code blocks if present
        const jsonString = content.replace(/^```json\n|\n```$/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("GPT Vision failed", error);
        throw error;
    }
}
