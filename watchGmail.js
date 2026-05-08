// watchGmail.js
import { google } from 'googleapis';
import auth from './googleAuth.js';

async function startWatch() {
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/${process.env.PUBSUB_TOPIC}`,
      labelIds: ['INBOX']
    }
  });

  console.log('Watch started:', res.data);
}

startWatch().catch(console.error);