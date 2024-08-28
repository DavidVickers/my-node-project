const jsforce = require('jsforce');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Salesforce connection
const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com'
});

// AWS S3 configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION  
});

// Salesforce credentials
const username = process.env.SF_USERNAME;
const password = process.env.SF_PASSWORD;

// Salesforce ContentDocumentId
const contentDocumentId = '069ao000005BSULAA4';

// Local download path
const downloadPath = '/Users/david.vickers/Downloads';

async function main() {
    try {
        // Login to Salesforce
        await conn.login(username, password);
        
        // Query Salesforce for the ContentVersion record
        const query = `SELECT Id, Title, VersionData, FileExtension FROM ContentVersion WHERE ContentDocumentId = '${contentDocumentId}' AND IsLatest = TRUE LIMIT 1`;
        const result = await conn.query(query);
        
        if (result.records.length === 0) {
            throw new Error('No ContentVersion found for the given ContentDocumentId');
        }
        
        const contentVersion = result.records[0];
        
        // Retrieve the blob data
        const fileData = await conn.request({
            method: 'GET',
            url: contentVersion.VersionData,
            encoding: 'text/plain'  
        });

        // Prepare the file name
        const fileName = `${contentVersion.Title}.${contentVersion.FileExtension}`;
        const s3Key = `Salesforcedemo/${fileName}`;

        // Save file locally
        await saveFileLocally(fileData, fileName);

        // Upload the file to S3
        await uploadToS3(s3Key, fileData, fileName);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Logout from Salesforce
        if (conn.accessToken) {
            await conn.logout();
        }
    }
}

async function saveFileLocally(fileData, fileName) {
    const filePath = path.join(downloadPath, fileName);
    try {
        await fs.writeFile(filePath, fileData);
        console.log(`File saved locally: ${filePath}`);
    } catch (error) {
        console.error('Error saving file locally:', error);
        throw error;
    }
}

function uploadToS3(s3Key, fileContent, fileName) {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: getContentType(fileName)
        };

        s3.upload(params, function(err, data) {
            if (err) {
                console.error("Error uploading file:", err);
                reject(err);
            } else {
                console.log(`File uploaded successfully to ${data.Location}`);
                resolve(data);
            }
        });
    });
}

function getContentType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    // ... (rest of your getContentType function)
}

main();