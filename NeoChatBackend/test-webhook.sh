#!/bin/bash

# Script de test du webhook Evolution API
# Simule un message WhatsApp entrant

echo "🧪 Test du webhook Evolution API..."
echo ""

# Payload simulant un message WhatsApp
curl -X POST http://localhost:3001/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "Test_NeoChat_15",
    "data": {
      "key": {
        "remoteJid": "221234567890@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST123456"
      },
      "message": {
        "conversation": "Qui est NéoCat ?"
      },
      "messageTimestamp": 1234567890,
      "pushName": "Test User"
    }
  }'

echo ""
echo ""
echo "✅ Requête envoyée. Vérifiez les logs du backend."
