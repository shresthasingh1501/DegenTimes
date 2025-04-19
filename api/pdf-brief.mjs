// api/pdf-brief.mjs
import axios from 'axios';

export default async (req, res) => {
  console.log("Vercel function /api/pdf-brief (get URL) called"); // Debug: Function entry

  try {
    const apiKey = process.env.OPENSERV_API_KEY;
    const workspaceId = process.env.VITE_OPENSERV_WORKSPACE_ID; // Get workspace ID from env

    console.log("API Key:", apiKey ? 'Present' : 'Missing'); // Debug: API key presence
    console.log("Workspace ID:", workspaceId ? 'Present' : 'Missing'); // Debug: Workspace ID presence

    if (!apiKey) {
      console.error("Error: API key not found on the server.");
      return res.status(500).json({ error: "API key not found on the server." });
    }

    if (!workspaceId) {
      console.error("Error: Workspace ID not found on the server. Ensure VITE_OPENSERV_WORKSPACE_ID is set.");
      return res.status(500).json({ error: "Workspace ID not found on the server." });
    }

    console.log("Fetching file list from API..."); // Debug: Before API request

    // Construct the URL using the environment variable
    const apiUrl = `https://api.openserv.ai/workspaces/${workspaceId}/files`;
    console.log("API URL:", apiUrl); // Debug: Constructed API URL

    const response = await axios.get(apiUrl, {
      headers: {
        'accept': 'application/json',
        'x-openserv-key': apiKey
      }
    });

    console.log("API Response Status:", response.status); // Debug: API status

    if (response.status !== 200) {
      console.error("API responded with:", response.status, response.data);
      return res.status(response.status).json({ error: `API responded with status ${response.status}` });
    }

    const data = response.data;
    // console.log("API Response Data:", data); // Debug: Raw API data (optional)

    if (data && data.length > 0) {
      const lastFile = data[data.length - 1];
      const pdfUrl = lastFile.fullUrl;
      console.log("Extracted PDF URL:", pdfUrl); // Debug: Extracted URL

      // Return the URL as JSON
      return res.status(200).json({ pdfUrl: pdfUrl });

    } else {
      console.warn('No files found in the response.');
      return res.status(404).json({ error: "No PDF file found." });
    }
  } catch (error) {
    console.error('Failed to fetch files:', error);
    console.error("Error Details:", error.message, error.stack); //More Detailed Error Info
    return res.status(500).json({ error: `Failed to fetch PDF URL: ${error.message || 'Unknown error'}` });
  }
};
