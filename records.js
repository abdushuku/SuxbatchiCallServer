import twilio from 'twilio'
import dotenv from 'dotenv'
dotenv.config();


const accountSid = process.env.AUTH_SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function listUsageRecordToday() {
  const todays = await client.usage.records.today.list({
    category: "calls",
    limit: 20,
  });

  todays.forEach((t) => console.log(t));
}

listUsageRecordToday();