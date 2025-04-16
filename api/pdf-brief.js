// api/pdf-brief.js
const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const apiKey = process.env.OPENSERV_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key not found on the server." });
    }

    const response = await axios.get('https://api.openserv.ai/workspaces/3361/files', {
      headers: {
        'accept': 'application/json',
        'x-openserv-key': apiKey
      }
    });

    if (response.status !== 200) {
      console.error("API responded with:", response.status, response.data);
      return res.status(response.status).json({ error: `API responded with status ${response.status}` });
    }

    const data = response.data;

    if (data && data.length > 0) {
      const lastFile = data[data.length - 1];
      const pdfUrl = lastFile.fullUrl;
      return res.redirect(pdfUrl);
    } else {
      console.warn('No files found in the response.');
      return res.status(404).json({ error: "No PDF file found." });
    }
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return res.status(500).json({ error: `Failed to fetch PDF: ${error.message || 'Unknown error'}` });
  }
};
