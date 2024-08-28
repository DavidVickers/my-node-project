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
        uploadToS3(s3Key,fileData,fileName);
        
        // Clean up: Remove the temporary file
        fs.unlinkSync(filePath);

    } catch (error) {
        console.error('Error:', error);
    }
}

function uploadToS3(s3Key, fileContent, fileName) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME, // Assuming S3 bucket name is set in .env
        Key: s3Key,
        Body: fileContent,
        ContentType: getContentType(fileName)
    };
    
    s3.upload(params, function(err, data) {
        if (err) {
            console.error("Error uploading file:", err);
        } else {
            console.log(`File uploaded successfully to ${data.Location}`);
        }
    });
}


function getContentType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();

    const mimeTypes = {
        'txt': 'text/plain',
        'csv': 'text/csv',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'tiff': 'image/tiff',
        'ico': 'image/x-icon',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',
        'midi': 'audio/midi',
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
        'exe': 'application/x-msdownload',
        'ttf': 'font/ttf',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
        'otf': 'font/otf'
    };

    return mimeTypes[extension] || 'application/octet-stream';
}

main();
