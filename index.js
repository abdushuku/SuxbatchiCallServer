import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

import OpenAi from 'openai';
const openai = new OpenAi({ apiKey: process.env.OPENAI_API_KEY});

const { VoiceResponse } = twilio.twiml;
const app = express();
const port = process.env.PORT || 3004;

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

    return completion.choices[0].message.content;
}

function ttsConfig(gptText) {
    return {
        method: 'post',
        url: process.env.MOHIRAI_TTS,
        headers: {
            Authorization: process.env.MOHIRAI_API_KEY,
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
    try {
        const response = await axios(config);
        return response.data.result.url;
    } catch (error) {
        console.error(`TTS Service Error: ${error.message}`);
        throw error;
    }
}

// Handle incoming calls
app.post('/voice', async (req, res) => {
    const twiml = new VoiceResponse();
    try {
        const firstTtsUrl = await ttsResponse('Assalomu alaykum sizga qanday yordam bera olaman?');

        const gather = twiml.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });

        gather.play(firstTtsUrl);
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error in /voice route:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle the gather completion
app.post('/handle-gather-complete', async (req, res) => {
    const userMessage = req.body.SpeechResult;

    if (!userMessage) {
        console.error('No speech input provided');
        const twimlResponse = new VoiceResponse();
        try {
            const errorTtsUrl = await ttsResponse("Uzur, nimadur xato ketdi");
            const gather = twimlResponse.gather({
                input: 'speech',
                action: '/handle-gather-complete',
                speechTimeout: 'auto',
                speechModel: 'phone_call',
                language: 'uz-UZ'
            });
            gather.play(errorTtsUrl);
            res.type('text/xml');
            res.send(twimlResponse.toString());
        } catch (error) {
            console.error('Error in handling no speech input:', error);
            res.status(500).send('Internal Server Error');
        }
        return;
    }

    try {
        // Fetch GPT response and TTS response in parallel
        const [gptText, secondTtsUrl] = await Promise.all([
            getGPTResponse(userMessage),
            ttsResponse("Yana qanday yordam bera olaman")
        ]);

        const ttsResponseUrl = await ttsResponse(gptText);

        const twimlResponse = new VoiceResponse();
        twimlResponse.play(ttsResponseUrl);

        const gather = twimlResponse.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });
        gather.play(secondTtsUrl);

        res.type('text/xml');
        res.send(twimlResponse.toString());
    } catch (error) {
        console.error('Error handling the gather completion:', error);
        const twimlResponse = new VoiceResponse();
        try {
            const catchTtsUrl = await ttsResponse("Xatolik yuz berdi. Iltimos qayta urunib ko'ring");
            twimlResponse.play(catchTtsUrl);
        } catch (ttsError) {
            console.error('Error generating TTS for error message:', ttsError);
        }
        res.type('text/xml');
        res.send(twimlResponse.toString());
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
