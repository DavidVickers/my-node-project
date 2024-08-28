// Import required modules
const jsforce = require('jsforce');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Destructure environment variables from .env file
const { SF_USERNAME, SF_PASSWORD } = process.env;

// Check if Salesforce username or password is missing
if (!SF_USERNAME || !SF_PASSWORD) {
    console.error('Salesforce username or password not set in .env file');
    process.exit(1); // Exit the process if credentials are not found
}

// Create a new Salesforce connection instance
const conn = new jsforce.Connection();

// Function to download a file from Salesforce using its ContentDocumentId
async function downloadFile(contentDocumentId) {
    try {
        // Log in to Salesforce using credentials from .env file
        await conn.login(SF_USERNAME, SF_PASSWORD);
        console.log('Logged into Salesforce');
        
        // Query to fetch the latest version of the file based on ContentDocumentId
        const query = `
            SELECT Id, ContentDocumentId, Title, FileExtension
            FROM ContentVersion
            WHERE ContentDocumentId = '${contentDocumentId}'
            ORDER BY VersionNumber DESC
            LIMIT 1
        `;
        const result = await conn.query(query);

        // If no file is found, log an error and return
        if (result.records.length === 0) {
            console.error('No file found with the provided ContentDocumentId');
            return;
        }

        // Extract file details from the query result
        const file = result.records[0];
        const filePath = path.join(__dirname, 'tmp', `${file.Title}.${file.FileExtension}`);
        
        // Ensure the directory exists, create it if not
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        // Retrieve the file version data from Salesforce
        const versionData = await conn.sobject('ContentVersion').retrieve(file.Id);
        const fileUrl = `${conn.instanceUrl}${versionData.VersionData}`;

        // Make a request to download the file from Salesforce
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream',
            headers: {
                Authorization: `Bearer ${conn.accessToken}`
            }
        });

        // Create a write stream to save the downloaded file
        const fileStream = fs.createWriteStream(filePath);
        response.data.pipe(fileStream);

        // Log success message once the file download is complete
        fileStream.on('finish', () => {
            console.log(`File downloaded to ${filePath}`);
        });

        // Handle errors during file write process
        fileStream.on('error', (error) => {
            console.error('Error writing file:', error);
        });
    } catch (error) {
        // Log any errors that occur during the download process
        console.error('Error downloading file:', error);
    }
}

// Example ContentDocumentId to download the file
const contentDocumentId = '069ao000005BSULAA4';
downloadFile(contentDocumentId); // Initiate file download
