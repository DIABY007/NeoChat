import axios from 'axios';

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

export interface DifyResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
}

export async function sendMessageToDify(
  appId: string,
  apiKey: string,
  userMessage: string,
  conversationId?: string
): Promise<DifyResponse> {
  try {
    console.log(`[Dify] Envoi du message à l'app ${appId}`);

    const response = await axios.post(
      `${DIFY_API_URL}/chat-messages`,
      {
        inputs: {},
        query: userMessage,
        response_mode: 'blocking',
        conversation_id: conversationId || '',
        user: 'whatsapp-user',
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Dify] Réponse reçue de l'app ${appId}`);

    return {
      answer: response.data.answer,
      conversation_id: response.data.conversation_id,
      message_id: response.data.message_id,
    };
  } catch (error: any) {
    console.error(`[Dify] Erreur lors de l'envoi du message:`, error.message);
    throw new Error('Impossible de communiquer avec Dify');
  }
}

export interface DifyDocumentUploadResponse {
  document: {
    id: string;
    name: string;
    data_source_type: string;
  };
  batch: string;
}

export async function uploadDocumentToDify(
  datasetId: string,
  apiKey: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<DifyDocumentUploadResponse> {
  try {
    console.log(`[Dify] Upload du document ${fileName} vers dataset ${datasetId}`);

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    formData.append('indexing_technique', 'high_quality');
    formData.append('process_rule', JSON.stringify({
      mode: 'automatic',
    }));

    const response = await axios.post(
      `${DIFY_API_URL}/datasets/${datasetId}/document/create_by_file`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
      }
    );

    console.log(`[Dify] Document uploadé avec succès: ${response.data.document.id}`);

    return response.data;
  } catch (error: any) {
    console.error(`[Dify] Erreur lors de l'upload du document:`, error.response?.data || error.message);
    throw new Error('Impossible d\'uploader le document vers Dify');
  }
}

export async function addTextToDataset(
  datasetId: string,
  apiKey: string,
  text: string,
  name: string = 'Instructions'
): Promise<DifyDocumentUploadResponse> {
  try {
    console.log(`[Dify] Ajout de texte vers dataset ${datasetId}`);

    const response = await axios.post(
      `${DIFY_API_URL}/datasets/${datasetId}/document/create_by_text`,
      {
        name,
        text,
        indexing_technique: 'high_quality',
        process_rule: {
          mode: 'automatic',
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[Dify] Texte ajouté avec succès: ${response.data.document.id}`);

    return response.data;
  } catch (error: any) {
    console.error(`[Dify] Erreur lors de l'ajout du texte:`, error.response?.data || error.message);
    throw new Error('Impossible d\'ajouter le texte vers Dify');
  }
}
