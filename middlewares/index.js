import express from 'express';
import bodyParser from 'body-parser';
import { voice, handle_gather_complete } from './Controller/callService.Controller.js';

const app = express();
const port = process.env.PORT || 3004;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('trust proxy', 1); // Trust first proxy

app.post('/voice', voice )
app.post('/handle-gather-complete', handle_gather_complete )

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
