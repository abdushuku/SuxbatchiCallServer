import axios from 'axios';
import OpenAi from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAi(process.env.OPENAI_API_KEY);


async function getGPTResponse(userMessage) {
    const startTime = new Date();  // Capture start time

    const completion = await openai.chat.completions.create({
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage }
        ],
        model: "gpt-4o-mini-2024-07-18"
    });

    const endTime = new Date();  // Capture end time
    const responseTime = endTime - startTime;  // Calculate response time in milliseconds

    console.log(`GPT Response Time: ${responseTime} ms`);  // Log the response time

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


async function userMessageError( res) {
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

async function CatchError(error){
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

export { getGPTResponse, ttsResponse, userMessageError, CatchError }