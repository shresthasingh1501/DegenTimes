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

    if (data && Array.isArray(data) && data.length > 0) {

      // --- New Logic: Find the PDF with the highest ID ---
      console.log("Filtering for PDF files and finding the highest ID...");

      // 1. Filter out only the PDF files
      const pdfFiles = data.filter(file =>
        file.path && typeof file.path === 'string' && file.path.toLowerCase().endsWith('.pdf')
      );

      if (pdfFiles.length === 0) {
        console.warn('No PDF files found in the response after filtering.');
        return res.status(404).json({ error: "No PDF file found." });
      }

      console.log(`Found ${pdfFiles.length} PDF file(s).`);

      // 2. Find the PDF file with the highest ID among the filtered ones
      const highestIdPdf = pdfFiles.reduce((maxIdFile, currentFile) => {
        // Ensure both files have valid IDs before comparing
        const maxId = maxIdFile && typeof maxIdFile.id === 'number' ? maxIdFile.id : -1;
        const currentId = currentFile && typeof currentFile.id === 'number' ? currentFile.id : -1;

        if (currentId > maxId) {
          return currentFile; // Current file has a higher ID
        } else {
          return maxIdFile; // Stick with the previous max ID file
        }
      }, pdfFiles[0]); // Start comparison with the first PDF found

      console.log("Highest ID PDF File:", highestIdPdf); // Debug: Show the identified file object

      if (highestIdPdf && highestIdPdf.fullUrl) {
        const pdfUrl = highestIdPdf.fullUrl;
        console.log("Extracted PDF URL (highest ID):", pdfUrl); // Debug: Extracted URL

        // Return the URL as JSON
        return res.status(200).json({ pdfUrl: pdfUrl });
      } else {
         // This case should ideally not happen if pdfFiles.length > 0 and reduce worked, but good for safety
         console.error('Could not determine the PDF file with the highest ID or it lacked a fullUrl.');
         return res.status(404).json({ error: "Could not find a valid PDF file with the highest ID." });
      }
      // --- End of New Logic ---

    } else {
      console.warn('No files found in the response or response data is not an array.');
      return res.status(404).json({ error: "No files found in the API response." });
    }
  } catch (error) {
    console.error('Failed to fetch files:', error);
    // Add more details if it's an Axios error
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Axios Error Data:", error.response.data);
      console.error("Axios Error Status:", error.response.status);
      console.error("Axios Error Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Axios Error Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error Message:', error.message);
    }
    console.error("Error Stack:", error.stack); // More Detailed Error Info
    return res.status(500).json({ error: `Failed to fetch PDF URL: ${error.message || 'Unknown error'}` });
  }
};
