// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const auth = require('./googleAuth');
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const app = express();

app.use(bodyParser.json());

let lastHistoryId = null;

app.post('/gmail/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message?.data) {
      return res.sendStatus(200);
    }

    const decoded = JSON.parse(
      Buffer.from(message.data, 'base64').toString()
    );

    const historyId = decoded.historyId;

    if (!lastHistoryId) {
      lastHistoryId = historyId;
      return res.sendStatus(200);
    }

    await processHistory(lastHistoryId);
    lastHistoryId = historyId;

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

async function processHistory(startHistoryId) {
  const gmail = google.gmail({ version: 'v1', auth });

  const historyRes = await gmail.users.history.list({
    userId: 'me',
    startHistoryId,
    historyTypes: ['messageAdded']
  });

  const histories = historyRes.data.history || [];

  for (const h of histories) {
    for (const msg of h.messagesAdded || []) {
      await notifySlack(msg.message.id);
    }
  }
}

async function notifySlack(messageId) {
  const gmail = google.gmail({ version: 'v1', auth });

  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject']
  });

  const headers = msg.data.payload.headers;
  const from = headers.find(h => h.name === 'From')?.value;
  const subject = headers.find(h => h.name === 'Subject')?.value;

  await slack.chat.postMessage({
    channel: '#general',
    text: `📧 *New email*\n*From:* ${from}\n*Subject:* ${subject}`
  });
}

app.listen(3000, () => {
  console.log('Listening on port 3000');
});