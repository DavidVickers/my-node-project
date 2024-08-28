const jsforce = require('jsforce');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
// Salesforce connection
const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com' // or 'https://test.salesforce.com' for sandbox
});

console.log(`AWS Access Key ID: ${process.env.AWS_ACCESS_KEY_ID}`);
console.log(`AWS Access Key ID: ${process.env.AWS_ACCESS_KEY_ID}`);
console.log(`AWS Region: ${process.env.AWS_REGION}`);

// AWS S3 configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION  
});

// Salesforce credentials
const username = process.env.SF_USERNAME;
console.log(`Username: ${username}`);
const password = process.env.SF_PASSWORD;
console.log(`Password: ${password}`);

// Salesforce ContentDocumentId
const contentDocumentId = '069ao000005BSULAA4';

async function main() {
    try {
        // Login to Salesforce
        await conn.login(username, password);
        
        // Query Salesforce for the ContentVersion record
        const query = `SELECT Id, Title, VersionData, FileExtension FROM ContentVersion WHERE ContentDocumentId = '${contentDocumentId}' AND IsLatest = TRUE LIMIT 1`;
        const result = await conn.query(query);
        const contentVersion = result.records[0];
        
        // Retrieve the blob data
        const versionDatablob = contentVersion.VersionData;
        const fileData = await conn.request({
            method: 'GET',
            url: versionDatablob,
            encoding: null  // Ensure the data is received as a Buffer
        });

        // Prepare the file for S3
        const fileName = `${contentVersion.Title}.${contentVersion.FileExtension}`;
        const filePath = path.join('/tmp', fileName);

        // Write the file locally
        fs.writeFileSync(filePath, fileData, 'binary');


        const s3Key = `Salesforcedemo/${fileName}`;
        // Upload the file to S3
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fs.createReadStream(filePath),
            ContentType: 'image/png'
        };
        
        const uploadResult = await s3.upload(s3Params).promise();

        // Log the S3 URL
        console.log('File uploaded to S3:', uploadResult.Location);
        
        // Clean up: Remove the temporary file
        fs.unlinkSync(filePath);

    } catch (error) {
        console.error('Error:', error);
    }
}




main();
