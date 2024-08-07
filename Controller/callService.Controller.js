import twilio from 'twilio';
const {VoiceResponse} = twilio.twiml;

import { getGPTResponse, ttsResponse, userMessageError, CatchError } from '../Functions/callService.Functions.js';

const voice = async (req, res) => {
    const twiml = new VoiceResponse();
    try {
        twiml.play(ttsResponse("Assalomu alaykum"));
        const gather = twiml.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });

        gather.play(ttsResponse(' sizga qanday yordam bera olaman?'));
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error in /voice route:', error);
        res.status(500).send('Internal Server Error');
    }
}


const handle_gather_complete = async (req, res) => {
    const userMessage = req.body.SpeechResult;
    if (!userMessage) {
        return userMessageError(res); // Ensure userMessageError properly handles the response
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
        CatchError(error, res); // Ensure CatchError properly handles the response
    }
}



export { voice, handle_gather_complete };


