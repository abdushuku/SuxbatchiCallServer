import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import twilio from 'twilio';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
dotenv.config();
import db from './models/database.js'

import { fetchPhoneNumber, getFromJson } from './get.Cookie.js'
import OpenAi from 'openai';
const openai = new OpenAi({ apiKey: process.env.OPENAI_API_KEY });

const { VoiceResponse } = twilio.twiml;
const app = express();
const port = process.env.PORT || 3004;


app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5000',
    credentials: true,
    optionsSuccessStatus: 200
}))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json())
app.set('trust proxy', 1); // Trust first proxy

async function getCompanyInfo(user_phonenumber) {
    const data = await db.query('SELECT * FROM model WHERE phone_number = $1', [user_phonenumber]);
    return data;
}

function ttsConfig(gptText) {
    return {
        method: 'post',
        url: process.env.MOHIRAI_TTS,
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
    try {
        const config = ttsConfig(gptText);
        const response = await axios(config);
        return response.data.result.url;
    } catch (error) {
        console.error(`TTS Service Error: ${error.message}`);
        throw error;
    }
}


// Function to get GPT response
async function getGPTResponse(userMessage, system_promp) {
    const startTime = new Date();
    const forbiddenTopics = ["personal", "finance", "politics"];
    const isForbidden = forbiddenTopics.some(topic => userMessage.toLowerCase().includes(topic));
    if (isForbidden) {
        console.log(`Forbidden topic detected: ${userMessage}`);
        return "I'm sorry, I can only assist with questions related to Suhbatchi's services.";
    }
    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: system_promp },
            { role: "user", content: userMessage }
        ],
        model: "gpt-4o-mini-2024-07-18"
    });
    const endTime = new Date();
    const responseTime = endTime - startTime;
    console.log(`GPT Response Time: ${responseTime} ms`);
    const gptResponse = completion.choices[0].message.content;
    const forbiddenKeywords = ["personal", "unrelated"];
    const containsForbiddenContent = forbiddenKeywords.some(keyword => gptResponse.toLowerCase().includes(keyword));
    if (containsForbiddenContent) {
        console.log(`Forbidden content detected in GPT response: ${gptResponse}`);
        return "I'm sorry, I can only assist with questions related to Suhbatchi's services.";
    }
    return gptResponse;
}

app.get('/',  async (req, res) => {
    const data = await getFromJson();
    try {
        const {rows} = await db.query('SELECT * FROM model WHERE phone_number = $1', [data.phoneNumber]);
        res.json(rows);
    } catch (error) {
        console.log(error);
    }
});




app.post('/models', async (req, res) => {
    const { first_word, system_promp, phone_number, userId } = req.body;
    const data = { first_word, system_promp, phone_number, userId };
    console.log(data);

    try {
        await fetchPhoneNumber(userId)
        const phone_number = await getFromJson();
        await db.query(
            'INSERT INTO model (first_word, system_promp, phone_number) VALUES ($1, $2, $3)',
            [first_word, system_promp, phone_number]
        );
        console.log("Cookie set successfully");
        return res.status(200).json({ message: 'Data inserted and cookie set successfully' });
    } catch (error) {
        console.error('Error during database insertion:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});



app.post('/voice', async (req, res) => {
    const twiml = new VoiceResponse();
    console.log('Cookies:', req.cookies);
    try {
        const user_phonenumber = await getFromJson();
        const phoneNumber = +user_phonenumber.phoneNumber;
        console.log('User phone number:', user_phonenumber);
        if (!user_phonenumber) {
            console.error('User phone number cookie not found');
            return res.status(400).send('User phone number not found in cookies');
        }
        // Update the query to use the correct column name
        const data = await db.query('SELECT * FROM model WHERE phone_number = $1', [phoneNumber]);
        console.log('Company Info:', data.rows[0]);

        const first_word = data.rows[0].first_word;
        const twilioPlayUrl = await ttsResponse(first_word);
        const firstTtsUrl = await ttsResponse('Yordam berishdan mamnunmiz!');

        twiml.play(twilioPlayUrl);
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
        const user_phonenumber = await getFromJson();
        const data = await db.query('SELECT * FROM model WHERE phone_number = $1', [user_phonenumber]);
        console.log(data.rows[0].system_promp);
        const [gptText, secondTtsUrl] = await Promise.all([
            getGPTResponse(userMessage, data.rows[0].system_promp),
            ttsResponse("Yana qanday yordam bera olaman")
        ]);

        if (!gptText || !secondTtsUrl) {
            throw new Error('Invalid GPT response or TTS URL');
        }

        const ttsResponseUrl = await ttsResponse(gptText);
        if (!ttsResponseUrl) {
            throw new Error('Invalid TTS response URL');
        }

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
            if (!catchTtsUrl) {
                throw new Error('Failed to generate error TTS URL');
            }
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