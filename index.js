import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

import OpenAi from 'openai';
const openai = new OpenAi({ apiKey: process.env.OPENAI_API_KEY });

const { VoiceResponse } = twilio.twiml;
const app = express();
const port = 3004;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('trust proxy', 1); // Trust first proxy

// Function to get GPT response
async function getGPTResponse(userMessage) {
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage }
        ],
        model: "gpt-4o-mini-2024-07-18"
    });

    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

function ttsConfig(gptText) {
    return {
        method: 'post',
        url:"https://mohir.ai/api/v1/tts",
        headers: {
            Authorization: `${process.env.MOHIRAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        data: {
            text: gptText,
            module: 'davron-neutral',
            blocking: 'true',
        }
    };
}

// Function to get TTS response
async function ttsResponse(gptText) {
    const config = ttsConfig(gptText);
    console.log('TTS Request Config:', config);

    try {
        const response = await axios(config);
        console.log('TTS Response:', response.data);
        return response;
    } catch (error) {
        console.error(`TTS Service Error: ${error.message}`);
        throw error;
    }
}

// Handle incoming calls
app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    twiml.say('Hello, how can I assist you today?');

    const gather = twiml.gather({
        input: 'speech',
        action: '/handle-gather-complete',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        language: 'uz-UZ'
    });

    gather.say('Please say something and I will assist you.');
    res.type('text/xml');
    res.send(twiml.toString());
});

// Handle the gather completion
app.post('/handle-gather-complete', async (req, res) => {
    const userMessage = req.body.SpeechResult;

    if (!userMessage) {
        console.error('No speech input provided');
        const twimlResponse = new VoiceResponse();
        twimlResponse.say('Sorry, I did not get that. Please try again.');
        const gather = twimlResponse.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });
        gather.say('Please say something and I will assist you.');
        res.type('text/xml');
        res.send(twimlResponse.toString());
        return;
    }

    try {
        const gptText = await getGPTResponse(userMessage);
        const ttsResponseData = await ttsResponse(gptText);

        // Log the entire ttsResponseData to debug
        console.log('TTS Response Data:', ttsResponseData);

        // Ensure the structure is correct
        const audioUrl = ttsResponseData.data.result.url; // Adjust as necessary based on actual response

        const twimlResponse = new VoiceResponse();
        twimlResponse.play(audioUrl);

        const gather = twimlResponse.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });
        gather.say('Please say something and I will assist you.');

        res.type('text/xml');
        res.send(twimlResponse.toString());
    } catch (error) {
        console.error('Error handling the gather completion:', error);
        const twimlResponse = new VoiceResponse();
        twimlResponse.say('Sorry, something went wrong. Please try again later.');
        res.type('text/xml');
        res.send(twimlResponse.toString());
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});