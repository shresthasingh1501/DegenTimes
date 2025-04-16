// api/pdf-brief.mjs
import axios from 'axios'; // Import axios

export default async (req, res) => { // Export the function
  console.log("Vercel function /api/pdf-brief called");

  try {
    const apiKey = process.env.OPENSERV_API_KEY;
    console.log("API Key:", apiKey ? 'Present' : 'Missing');

    if (!apiKey) {
      console.error("Error: API key not found on the server.");
      return res.status(500).json({ error: "API key not found on the server." });
    }

    console.log("Fetching file list from API...");

    const response = await axios.get('https://api.openserv.ai/workspaces/3361/files', {
      headers: {
        'accept': 'application/json',
        'x-openserv-key': apiKey
      }
    });

    console.log("API Response Status:", response.status);

    if (response.status !== 200) {
      console.error("API responded with:", response.status, response.data);
      return res.status(response.status).json({ error: `API responded with status ${response.status}` });
    }

    const data = response.data;
    console.log("API Response Data:", data);

    if (data && data.length > 0) {
      const lastFile = data[data.length - 1];
      const pdfUrl = lastFile.fullUrl;
      console.log("Extracted PDF URL:", pdfUrl);
      return res.redirect(pdfUrl);
    } else {
      console.warn('No files found in the response.');
      return res.status(404).json({ error: "No PDF file found." });
    }
  } catch (error) {
    console.error('Failed to fetch files:', error);
    console.error("Error Details:", error.message, error.stack);
    return res.status(500).json({ error: `Failed to fetch PDF: ${error.message || 'Unknown error'}` });
  }
};
