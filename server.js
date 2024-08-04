const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const axios = require('axios');
require('dotenv').config();

const app = express();
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.AUTH_SID, process.env.AUTH_TOKEN);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        input: 'speech',
        action: '/handle-speech',
        speechTimeout: 'auto'
    });
    gather.say('Hello! How can I assist you today? Please say something.');
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/handle-speech', async (req, res) => {
    const speechResult = req.body.SpeechResult;
    const gptResponse = await getGPTResponse(speechResult);
    const ttsResponse = await getTTSResponse(gptResponse);

    const twiml = new VoiceResponse();
    twiml.say(ttsResponse);
    twiml.redirect('/voice');
    
    res.type('text/xml');
    res.send(twiml.toString());
});

async function getGPTResponse(speechInput) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo", // Updated model name
            messages: [{ role: "user", content: speechInput }],
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting GPT AI response:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        return 'Sorry, I am having trouble understanding you.';
    }
}

async function getTTSResponse(text) {
    try {
        const config = {
            method: 'post',
            url: 'https://mohir.ai/api/v1/tts',
            headers: {
                Authorization: `Bearer ${process.env.MOHIRAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: {
                text: text,
                model: 'davron-neutral',
                blocking: 'true',
            }
        };
        const response = await axios(config);
        return response.data.audioUrl;
    } catch (error) {
        console.error('Error getting TTS response:', error);
        return 'Sorry, I am having trouble speaking right now.';
    }
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
