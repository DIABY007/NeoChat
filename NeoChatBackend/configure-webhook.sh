#!/bin/bash

# Configuration du webhook Evolution API pour l'instance Test_NeoChat_15
# Puisque Evolution API tourne dans Docker, on utilise host.docker.internal

echo "🔧 Configuration du webhook Evolution API..."
echo ""

# Variables
INSTANCE_NAME="Test_NeoChat_15"
EVOLUTION_API_URL="${EVOLUTION_API_URL:-http://localhost:8080}"
EVOLUTION_API_KEY="${EVOLUTION_API_KEY:-your_evolution_api_key_here}"  # Remplacez par votre vraie clé API
WEBHOOK_URL="${BACKEND_WEBHOOK_URL:-http://localhost:3001/api/webhook/evolution}"

echo "Instance: $INSTANCE_NAME"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Configurer le webhook
curl -X POST "$EVOLUTION_API_URL/webhook/set/$INSTANCE_NAME" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"enabled\": true,
      \"url\": \"$WEBHOOK_URL\",
      \"webhook_by_events\": false,
      \"webhook_base64\": false,
      \"events\": [
        \"MESSAGES_UPSERT\",
        \"MESSAGES_UPDATE\",
        \"MESSAGES_DELETE\",
        \"SEND_MESSAGE\",
        \"CONNECTION_UPDATE\"
      ]
    }
  }"

echo ""
echo ""
echo "✅ Webhook configuré !"
echo ""
echo "Pour vérifier la configuration :"
echo "curl -X GET $EVOLUTION_API_URL/webhook/find/$INSTANCE_NAME -H 'apikey: $EVOLUTION_API_KEY'"
