---
name: evolution-api
description: Comprehensive skill for Evolution API - open-source WhatsApp integration platform with multi-service chatbot and automation support
---

# Evolution API Skill

Expert assistance for building WhatsApp integrations and multi-channel messaging automation using Evolution API - an open-source platform for WhatsApp, chatbots, and business communication.

## When to Use This Skill

This skill should be used when:
- Building WhatsApp integrations and chatbots
- Creating automated messaging systems
- Integrating WhatsApp with business applications
- Setting up multi-channel customer service platforms
- Implementing chatbot flows with Typebot, Chatwoot, or Dify
- Connecting WhatsApp to CRM systems
- Building AI-powered conversational applications
- Setting up webhook-based message handling
- Implementing event-driven messaging architectures
- Managing WhatsApp Business API connections
- Integrating with OpenAI for intelligent responses
- Setting up message queuing with RabbitMQ, Kafka, or SQS
- Storing media files in S3 or MinIO
- Questions about Evolution API configuration and deployment
- Troubleshooting WhatsApp connection issues

## Overview

### What is Evolution API?

**Evolution API** is an open-source WhatsApp integration platform that:
- Provides RESTful API for WhatsApp messaging
- Supports both Baileys (free) and Official WhatsApp Business API
- Integrates with multiple chatbot and automation platforms
- Offers comprehensive webhook and event system
- Enables business messaging automation
- Completely free and self-hosted

**Evolution from CodeChat:**
> "Originally built as a WhatsApp control API using the Baileys library based on CodeChat, the platform has evolved significantly."

### Key Features

**Messaging Capabilities:**
- Send and receive WhatsApp messages
- Media support (images, videos, audio, documents)
- Group management and operations
- Contact management
- Message history and search
- Read receipts and status updates

**Integration Ecosystem:**
- **Typebot**: Visual chatbot builder
- **Chatwoot**: Customer service platform
- **Dify**: AI agent management
- **OpenAI**: AI-powered responses and audio transcription
- **Flowise**: Low-code AI workflow builder
- **N8N**: Workflow automation

**Technical Features:**
- RESTful API with comprehensive endpoints
- Webhook system for real-time events
- WebSocket support for live updates
- Message queue integration (RabbitMQ, Kafka, SQS)
- Database persistence (PostgreSQL, MySQL)
- Redis caching for performance
- S3/MinIO for media storage
- Docker deployment ready

## Installation

### Prerequisites

```bash
# Node.js 18+ or Docker
node --version  # v18.0.0 or higher

# Database (optional but recommended)
# PostgreSQL 12+ or MySQL 8+

# Redis (optional, for caching)
# Redis 6+
```

### Installation Methods

#### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Create environment file
cp .env.example .env

# Edit environment variables
nano .env

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f evolution-api
```

**Docker Compose Example:**

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://your-domain.com
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://user:pass@postgres:5432/evolution
      - AUTHENTICATION_API_KEY=your-secret-key-here
    volumes:
      - evolution_instances:/evolution/instances
    restart: unless-stopped

  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=your-db-password
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  evolution_instances:
  postgres_data:
  redis_data:
```

#### Option 2: NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18+
nvm install 18
nvm use 18

# Clone repository
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env

# Build
npm run build

# Start production
npm run start:prod

# Or development mode
npm run start:dev
```

#### Option 3: PM2 (Process Manager)

```bash
# After NVM installation above

# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/src/main.js --name evolution-api

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
```

## Configuration

### Essential Environment Variables

```bash
# Server Configuration
SERVER_TYPE=http                    # or https
SERVER_PORT=8080
SERVER_URL=https://your-domain.com  # For webhooks

# Authentication
AUTHENTICATION_API_KEY=your-secret-api-key-here
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Database (Recommended for production)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql        # or mysql
DATABASE_CONNECTION_URI=postgresql://user:pass@localhost:5432/evolution?schema=public
DATABASE_CONNECTION_CLIENT_NAME=evolution_instance

# Data Persistence
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true

# Redis Cache (Optional but recommended)
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379/6
CACHE_REDIS_PREFIX_KEY=evolution

# CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=INFO                      # ERROR, WARN, DEBUG, INFO, LOG, VERBOSE
LOG_COLOR=true
LOG_BAILEYS=error                   # fatal, error, warn, info, debug, trace

# Instance Management
DEL_INSTANCE=false                  # Auto-delete after X minutes (false = never)

# Language
LANGUAGE=en                         # or pt, es, etc.
```

### WhatsApp Configuration

```bash
# Session Configuration
CONFIG_SESSION_PHONE_CLIENT=Evolution API
CONFIG_SESSION_PHONE_NAME=Chrome

# QR Code Settings
QRCODE_LIMIT=30                     # Seconds before regeneration
QRCODE_COLOR=#175197               # QR code color

# WhatsApp Business API (Official)
WA_BUSINESS_TOKEN_WEBHOOK=evolution
WA_BUSINESS_URL=https://graph.facebook.com
WA_BUSINESS_VERSION=v20.0
WA_BUSINESS_LANGUAGE=en_US
```

### Webhook Configuration

```bash
# Global Webhook
WEBHOOK_GLOBAL_ENABLED=true
WEBHOOK_GLOBAL_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=true

# Event-specific webhooks
WEBHOOK_EVENTS_APPLICATION_STARTUP=true
WEBHOOK_EVENTS_QRCODE_UPDATED=true
WEBHOOK_EVENTS_MESSAGES_SET=true
WEBHOOK_EVENTS_MESSAGES_UPSERT=true
WEBHOOK_EVENTS_MESSAGES_UPDATE=true
WEBHOOK_EVENTS_MESSAGES_DELETE=true
WEBHOOK_EVENTS_SEND_MESSAGE=true
WEBHOOK_EVENTS_CONTACTS_SET=true
WEBHOOK_EVENTS_CONTACTS_UPSERT=true
WEBHOOK_EVENTS_CONTACTS_UPDATE=true
WEBHOOK_EVENTS_PRESENCE_UPDATE=true
WEBHOOK_EVENTS_CHATS_SET=true
WEBHOOK_EVENTS_CHATS_UPSERT=true
WEBHOOK_EVENTS_CHATS_UPDATE=true
WEBHOOK_EVENTS_CHATS_DELETE=true
WEBHOOK_EVENTS_GROUPS_UPSERT=true
WEBHOOK_EVENTS_GROUPS_UPDATE=true
WEBHOOK_EVENTS_GROUP_PARTICIPANTS_UPDATE=true
WEBHOOK_EVENTS_CONNECTION_UPDATE=true
WEBHOOK_EVENTS_CALL=true
WEBHOOK_EVENTS_TYPEBOT_START=true
WEBHOOK_EVENTS_TYPEBOT_CHANGE_STATUS=true
WEBHOOK_EVENTS_ERRORS=true
WEBHOOK_EVENTS_ERRORS_WEBHOOK=true
```

### Integration Configurations

**Typebot:**
```bash
TYPEBOT_API_VERSION=latest          # or specific version
```

**Chatwoot:**
```bash
CHATWOOT_ENABLED=true
CHATWOOT_MESSAGE_READ=true
CHATWOOT_MESSAGE_DELETE=true
CHATWOOT_IMPORT_DATABASE_CONNECTION_URI=postgresql://...
CHATWOOT_IMPORT_PLACEHOLDER_MEDIA_MESSAGE=true
```

**OpenAI:**
```bash
OPENAI_ENABLED=true
```

**Dify:**
```bash
DIFY_ENABLED=true
```

**RabbitMQ:**
```bash
RABBITMQ_ENABLED=true
RABBITMQ_URI=amqp://user:pass@localhost:5672
RABBITMQ_EXCHANGE_NAME=evolution_exchange
RABBITMQ_GLOBAL_ENABLED=true
```

**AWS SQS:**
```bash
SQS_ENABLED=true
SQS_ACCESS_KEY_ID=your-access-key
SQS_SECRET_ACCESS_KEY=your-secret-key
SQS_ACCOUNT_ID=123456789
SQS_REGION=us-east-1
```

**S3/MinIO Storage:**
```bash
S3_ENABLED=true
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=evolution
S3_ENDPOINT=s3.amazonaws.com        # or minio endpoint
S3_PORT=443
S3_USE_SSL=true
```

**WebSocket:**
```bash
WEBSOCKET_ENABLED=true
WEBSOCKET_GLOBAL_EVENTS=false
```

## Quick Start

### 1. Create Instance

```bash
# Using cURL
curl -X POST https://your-domain.com/instance/create \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-whatsapp-bot",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'

# Response includes QR code
{
  "instance": {
    "instanceName": "my-whatsapp-bot",
    "status": "created"
  },
  "qrcode": {
    "code": "data:image/png;base64,...",
    "base64": "..."
  }
}
```

### 2. Connect WhatsApp

Scan the QR code with WhatsApp on your phone:
1. Open WhatsApp
2. Go to Settings > Linked Devices
3. Click "Link a Device"
4. Scan the QR code from the API response

### 3. Check Connection Status

```bash
curl -X GET https://your-domain.com/instance/connectionState/my-whatsapp-bot \
  -H "apikey: your-api-key"

# Response
{
  "instance": {
    "instanceName": "my-whatsapp-bot",
    "state": "open"
  }
}
```

### 4. Send Message

```bash
curl -X POST https://your-domain.com/message/sendText/my-whatsapp-bot \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511999999999",
    "text": "Hello from Evolution API!"
  }'
```

## API Endpoints

### Instance Management

```bash
# Create instance
POST /instance/create
{
  "instanceName": "bot-name",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"  # or WHATSAPP-BUSINESS
}

# List instances
GET /instance/fetchInstances

# Get instance info
GET /instance/connectionState/{instanceName}

# Restart instance
PUT /instance/restart/{instanceName}

# Logout instance
DELETE /instance/logout/{instanceName}

# Delete instance
DELETE /instance/delete/{instanceName}
```

### Messaging

**Text Messages:**
```bash
POST /message/sendText/{instanceName}
{
  "number": "5511999999999",
  "text": "Your message here"
}
```

**Media Messages:**
```bash
# Image
POST /message/sendMedia/{instanceName}
{
  "number": "5511999999999",
  "mediatype": "image",
  "media": "https://example.com/image.jpg",  # or base64
  "caption": "Image caption"
}

# Video
POST /message/sendMedia/{instanceName}
{
  "number": "5511999999999",
  "mediatype": "video",
  "media": "https://example.com/video.mp4",
  "caption": "Video caption"
}

# Audio
POST /message/sendWhatsAppAudio/{instanceName}
{
  "number": "5511999999999",
  "audio": "https://example.com/audio.mp3"  # or base64
}

# Document
POST /message/sendMedia/{instanceName}
{
  "number": "5511999999999",
  "mediatype": "document",
  "media": "https://example.com/file.pdf",
  "fileName": "document.pdf"
}
```

**Advanced Messages:**
```bash
# Location
POST /message/sendLocation/{instanceName}
{
  "number": "5511999999999",
  "latitude": "-23.550520",
  "longitude": "-46.633308",
  "name": "Location Name",
  "address": "Address details"
}

# Contact
POST /message/sendContact/{instanceName}
{
  "number": "5511999999999",
  "contact": [{
    "fullName": "John Doe",
    "wuid": "5511888888888",
    "phoneNumber": "+55 11 98888-8888"
  }]
}

# List Message (Interactive)
POST /message/sendList/{instanceName}
{
  "number": "5511999999999",
  "title": "Choose an option",
  "description": "Select one option below",
  "buttonText": "Options",
  "footerText": "Footer text",
  "sections": [{
    "title": "Section 1",
    "rows": [{
      "title": "Option 1",
      "description": "Description 1",
      "rowId": "opt1"
    }]
  }]
}

# Button Message
POST /message/sendButtons/{instanceName}
{
  "number": "5511999999999",
  "title": "Button Message",
  "description": "Choose an action",
  "buttons": [{
    "type": "replyButton",
    "displayText": "Button 1",
    "id": "btn1"
  }],
  "footerText": "Footer"
}
```

### Groups

```bash
# Create group
POST /group/create/{instanceName}
{
  "subject": "Group Name",
  "participants": ["5511999999999", "5511888888888"]
}

# Update group info
PUT /group/updateGroupPicture/{instanceName}
{
  "groupJid": "groupid@g.us",
  "image": "base64-image-data"
}

# Add participants
POST /group/updateParticipant/{instanceName}
{
  "groupJid": "groupid@g.us",
  "action": "add",  # or remove, promote, demote
  "participants": ["5511999999999"]
}

# Leave group
DELETE /group/leaveGroup/{instanceName}
{
  "groupJid": "groupid@g.us"
}
```

### Contacts & Profile

```bash
# Get profile picture
GET /chat/profilePic/{instanceName}?number=5511999999999

# Get contacts
GET /chat/findContacts/{instanceName}?id=5511999999999

# Update profile name
PUT /chat/updateProfileName/{instanceName}
{
  "name": "My Bot Name"
}

# Update profile status
PUT /chat/updateProfileStatus/{instanceName}
{
  "status": "Available 24/7"
}

# Update profile picture
PUT /chat/updateProfilePicture/{instanceName}
{
  "picture": "base64-image-data"
}
```

### Webhooks

```bash
# Set instance webhook
POST /webhook/set/{instanceName}
{
  "url": "https://your-webhook.com/endpoint",
  "webhook_by_events": true,
  "webhook_base64": false,
  "events": [
    "QRCODE_UPDATED",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "SEND_MESSAGE",
    "CONNECTION_UPDATE"
  ]
}

# Get webhook info
GET /webhook/find/{instanceName}
```

## Integration Examples

### Typebot Integration

```bash
# Set Typebot on instance
POST /typebot/set/{instanceName}
{
  "enabled": true,
  "url": "https://typebot.io",
  "typebot": "typebot-flow-id",
  "expire": 20,           # Minutes of inactivity
  "keywordFinish": "exit",
  "delayMessage": 1000,
  "unknownMessage": "I didn't understand",
  "listeningFromMe": false
}

# Start Typebot session
POST /typebot/start/{instanceName}
{
  "url": "https://typebot.io",
  "typebot": "flow-id",
  "remoteJid": "5511999999999@s.whatsapp.net",
  "startSession": true,
  "variables": [{
    "name": "userName",
    "value": "John"
  }]
}

# Change Typebot status
POST /typebot/changeStatus/{instanceName}
{
  "remoteJid": "5511999999999@s.whatsapp.net",
  "status": "paused"  # or closed
}
```

### Chatwoot Integration

```bash
# Enable Chatwoot
POST /chatwoot/set/{instanceName}
{
  "enabled": true,
  "accountId": "123",
  "token": "chatwoot-api-token",
  "url": "https://app.chatwoot.com",
  "signMsg": true,
  "reopenConversation": true,
  "conversationPending": false
}
```

### OpenAI Integration

```bash
# Set OpenAI
POST /openai/set/{instanceName}
{
  "enabled": true,
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "maxTokens": 2000,
  "temperature": 0.7,
  "systemMessages": [{
    "role": "system",
    "content": "You are a helpful assistant."
  }],
  "assistantMessages": [{
    "role": "assistant",
    "content": "How can I help you?"
  }]
}
```

### Dify Integration

```bash
# Set Dify
POST /dify/set/{instanceName}
{
  "enabled": true,
  "apiUrl": "https://api.dify.ai/v1",
  "apiKey": "app-...",
  "botType": "chatbot",  # or agent, workflow
  "expire": 20,
  "keywordFinish": "exit"
}
```

## Webhook Handling

### Webhook Structure

```javascript
// Example webhook payload
{
  "event": "messages.upsert",
  "instance": "my-whatsapp-bot",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE5F4...",
      "participant": null
    },
    "pushName": "John Doe",
    "message": {
      "conversation": "Hello, how are you?"
    },
    "messageType": "conversation",
    "messageTimestamp": 1234567890,
    "instanceId": "instance-uuid",
    "source": "android"
  },
  "destination": "https://your-webhook.com/endpoint",
  "date_time": "2024-01-01T12:00:00.000Z",
  "server_url": "https://your-evolution-api.com",
  "apikey": "your-api-key"
}
```

### Node.js Webhook Handler

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', async (req, res) => {
  const { event, instance, data } = req.body;

  console.log(`Received event: ${event} from instance: ${instance}`);

  // Handle different events
  switch (event) {
    case 'messages.upsert':
      // New message received
      const message = data.message?.conversation ||
                     data.message?.extendedTextMessage?.text || '';
      const from = data.key.remoteJid;
      const fromMe = data.key.fromMe;

      if (!fromMe && message) {
        console.log(`Message from ${from}: ${message}`);

        // Process message and send response
        await sendResponse(instance, from, message);
      }
      break;

    case 'connection.update':
      // Connection status changed
      console.log('Connection status:', data);
      break;

    case 'qrcode.updated':
      // New QR code generated
      console.log('QR Code updated:', data.qrcode);
      break;

    default:
      console.log('Unhandled event:', event);
  }

  // Always respond 200 OK
  res.sendStatus(200);
});

async function sendResponse(instance, to, originalMessage) {
  const response = await fetch(`https://your-api.com/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'apikey': 'your-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      number: to.replace('@s.whatsapp.net', ''),
      text: `You said: ${originalMessage}`
    })
  });

  return response.json();
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Python Webhook Handler

```python
from flask import Flask, request
import requests

app = Flask(__name__)

API_URL = "https://your-evolution-api.com"
API_KEY = "your-api-key"

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    event = data.get('event')
    instance = data.get('instance')
    event_data = data.get('data')

    print(f"Received event: {event} from instance: {instance}")

    if event == 'messages.upsert':
        handle_message(instance, event_data)
    elif event == 'connection.update':
        handle_connection(event_data)
    elif event == 'qrcode.updated':
        handle_qrcode(event_data)

    return '', 200

def handle_message(instance, data):
    from_me = data['key'].get('fromMe', False)

    if from_me:
        return

    message = (data.get('message', {}).get('conversation') or
              data.get('message', {}).get('extendedTextMessage', {}).get('text') or '')

    remote_jid = data['key']['remoteJid']
    number = remote_jid.replace('@s.whatsapp.net', '')

    print(f"Message from {number}: {message}")

    # Send response
    send_message(instance, number, f"You said: {message}")

def send_message(instance, number, text):
    url = f"{API_URL}/message/sendText/{instance}"
    headers = {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
    }
    payload = {
        'number': number,
        'text': text
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()

def handle_connection(data):
    print(f"Connection update: {data}")

def handle_qrcode(data):
    print(f"QR Code updated")

if __name__ == '__main__':
    app.run(port=3000)
```

## Advanced Use Cases

### 1. AI-Powered Customer Service Bot

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleCustomerMessage(instance, from, message) {
  // Get conversation history from database
  const history = await getConversationHistory(from);

  // Get AI response
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful customer service agent." },
      ...history,
      { role: "user", content: message }
    ]
  });

  const aiResponse = completion.choices[0].message.content;

  // Save to history
  await saveToHistory(from, message, aiResponse);

  // Send response
  await sendMessage(instance, from, aiResponse);
}
```

### 2. Group Management Bot

```javascript
async function handleGroupCommand(instance, groupJid, command, sender) {
  const isAdmin = await checkIfAdmin(instance, groupJid, sender);

  if (!isAdmin) {
    await sendMessage(instance, groupJid, "Only admins can use this command");
    return;
  }

  switch (command) {
    case '/welcome':
      await setWelcomeMessage(groupJid);
      break;
    case '/rules':
      await sendGroupRules(instance, groupJid);
      break;
    case '/ban':
      const userToRemove = extractUserFromCommand(command);
      await removeParticipant(instance, groupJid, userToRemove);
      break;
  }
}
```

### 3. Broadcast System

```javascript
async function sendBroadcast(instance, recipients, message) {
  const results = [];

  for (const recipient of recipients) {
    try {
      await sendMessage(instance, recipient, message);
      results.push({ recipient, status: 'sent' });

      // Delay to avoid rate limiting
      await delay(1000);
    } catch (error) {
      results.push({ recipient, status: 'failed', error: error.message });
    }
  }

  return results;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4. Media Downloader Bot

```javascript
async function handleMediaMessage(instance, data) {
  const messageType = data.messageType;

  if (['imageMessage', 'videoMessage', 'documentMessage'].includes(messageType)) {
    // Download media
    const media = data.message[messageType];
    const buffer = await downloadMedia(instance, data.key.id);

    // Upload to S3
    const s3Url = await uploadToS3(buffer, media.mimetype);

    // Save to database
    await saveMediaReference({
      messageId: data.key.id,
      type: messageType,
      url: s3Url,
      from: data.key.remoteJid,
      timestamp: data.messageTimestamp
    });
  }
}
```

## Production Best Practices

### 1. Security

```bash
# Use strong API key
AUTHENTICATION_API_KEY=$(openssl rand -hex 32)

# Enable HTTPS
SERVER_TYPE=https

# Restrict CORS
CORS_ORIGIN=https://your-frontend.com
CORS_CREDENTIALS=true

# Use environment-specific configs
# .env.production, .env.staging, .env.development
```

### 2. High Availability

```yaml
# docker-compose.yml with replicas
services:
  evolution-api:
    image: atendai/evolution-api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
    environment:
      - DATABASE_ENABLED=true
      - CACHE_REDIS_ENABLED=true

  # Load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - evolution-api
```

### 3. Monitoring

```bash
# Enable detailed logging
LOG_LEVEL=DEBUG
LOG_COLOR=true
LOG_BAILEYS=info

# Use external monitoring
# - Prometheus for metrics
# - Grafana for dashboards
# - Sentry for error tracking

# Health check endpoint
curl https://your-api.com/health
```

### 4. Backup Strategy

```bash
# Database backups
pg_dump -h localhost -U evolution evolution > backup_$(date +%Y%m%d).sql

# Instance data backup
tar -czf instances_backup_$(date +%Y%m%d).tar.gz /evolution/instances/

# Automated backups with cron
0 2 * * * /scripts/backup.sh
```

### 5. Rate Limiting

```javascript
// Implement rate limiting in webhook handler
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/webhook', limiter);
```

## Troubleshooting

### Common Issues

#### QR Code Not Generating

```bash
# Check instance status
curl -X GET https://your-api.com/instance/connectionState/instance-name \
  -H "apikey: your-api-key"

# Restart instance
curl -X PUT https://your-api.com/instance/restart/instance-name \
  -H "apikey: your-api-key"

# Check logs
docker-compose logs -f evolution-api
```

#### Messages Not Sending

```bash
# Verify connection
GET /instance/connectionState/{instanceName}

# Check if number is valid
# Format: Country code + number (no +, no spaces)
# Example: 5511999999999

# Verify API key
curl -X GET https://your-api.com/instance/fetchInstances \
  -H "apikey: your-api-key"
```

#### Webhook Not Receiving Events

```bash
# Verify webhook configuration
GET /webhook/find/{instanceName}

# Test webhook endpoint
curl -X POST https://your-webhook.com/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check webhook URL is publicly accessible
# Use ngrok for local development:
ngrok http 3000
```

#### Database Connection Errors

```bash
# Test database connection
psql "postgresql://user:pass@localhost:5432/evolution"

# Check environment variables
echo $DATABASE_CONNECTION_URI

# Verify database exists
psql -l | grep evolution

# Run migrations if needed
npm run migration:run
```

#### Instance Disconnects Frequently

```bash
# Enable keep-alive
# Check mobile connection
# Verify phone battery saver is off
# Check WhatsApp version is up to date

# Increase session timeout
CONFIG_SESSION_PHONE_CLIENT=Evolution API
QRCODE_LIMIT=60  # Increase timeout
```

## Performance Optimization

### 1. Enable Caching

```bash
# Redis cache
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379/6
CACHE_REDIS_SAVE_INSTANCES=true
```

### 2. Database Optimization

```bash
# Index frequently queried fields
CREATE INDEX idx_messages_instance ON messages(instanceId);
CREATE INDEX idx_messages_jid ON messages(remoteJid);
CREATE INDEX idx_messages_timestamp ON messages(messageTimestamp);

# Partition large tables
# Clean old messages periodically
DELETE FROM messages WHERE messageTimestamp < NOW() - INTERVAL '90 days';
```

### 3. Media Storage

```bash
# Use S3 for media files
S3_ENABLED=true
S3_BUCKET=evolution-media

# Don't save media in database
DATABASE_SAVE_DATA_NEW_MESSAGE=false
```

### 4. Message Queue

```bash
# Use RabbitMQ for high volume
RABBITMQ_ENABLED=true
RABBITMQ_URI=amqp://localhost:5672

# Or SQS for AWS deployments
SQS_ENABLED=true
```

## Migration Guide

### From WhatsApp Web.js

```javascript
// WhatsApp Web.js
const { Client } = require('whatsapp-web.js');
const client = new Client();

client.on('message', msg => {
  if (msg.body === 'ping') {
    msg.reply('pong');
  }
});

client.initialize();

// Evolution API equivalent
app.post('/webhook', (req, res) => {
  const { event, data } = req.body;

  if (event === 'messages.upsert') {
    const message = data.message?.conversation;

    if (message === 'ping') {
      sendMessage(data.instance, data.key.remoteJid, 'pong');
    }
  }

  res.sendStatus(200);
});
```

### From Baileys Directly

Evolution API is built on Baileys, so migration is straightforward. Instead of managing Baileys directly, use Evolution API's REST endpoints.

## API Reference Summary

### Base URL Structure

```
https://your-domain.com/{endpoint}/{instanceName}
```

### Authentication

```bash
# All requests require API key header
apikey: your-api-key
```

### Main Endpoint Categories

- `/instance/*` - Instance management
- `/message/*` - Send messages
- `/chat/*` - Chat and contact operations
- `/group/*` - Group management
- `/webhook/*` - Webhook configuration
- `/typebot/*` - Typebot integration
- `/chatwoot/*` - Chatwoot integration
- `/openai/*` - OpenAI integration
- `/dify/*` - Dify integration

## Resources

### Official Links
- **Documentation**: https://doc.evolution-api.com/
- **GitHub**: https://github.com/EvolutionAPI/evolution-api
- **Website**: https://evolution-api.com

### Community
- **GitHub Discussions**: https://github.com/EvolutionAPI/evolution-api/discussions
- **Issues**: https://github.com/EvolutionAPI/evolution-api/issues

### Integration Partners
- **Typebot**: https://typebot.io
- **Chatwoot**: https://chatwoot.com
- **Dify**: https://dify.ai
- **N8N**: https://n8n.io
- **Flowise**: https://flowiseai.com

## License

Evolution API is licensed under Apache License 2.0 with specific requirements regarding branding notifications in implementations.

---

**Note**: This skill provides comprehensive guidance for building WhatsApp integrations with Evolution API. Always ensure compliance with WhatsApp's Terms of Service and local regulations when deploying messaging solutions.
