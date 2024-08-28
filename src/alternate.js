const jsforce = require('jsforce');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Salesforce connection
const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com' // or 'https://test.salesforce.com' for sandbox
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
            encoding: null  // Ensure the data is received as a Buffer
        });

        console.log('File data:', fileData);

        // Prepare the file for S3
        const fileName = `${contentVersion.Title}.${contentVersion.FileExtension}`;
        const s3Key = `Salesforcedemo/${fileName}`;

        // Upload the file to S3 directly from memory
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileData,
            ContentType: 'image/png'
        };
        
        const uploadResult = await s3.upload(s3Params).promise();

        // Log the S3 URL
        console.log('File uploaded to S3:', uploadResult.Location);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Logout from Salesforce
        if (conn.accessToken) {
            await conn.logout();
        }
    }
}

main();