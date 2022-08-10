const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const fs = require('fs');

aws.config.update({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_REGION
});

const s3 = new aws.S3();


exports.upload = async (req,res) => {
    var encode = req.body.base;

    let decode = Buffer.from(encode, 'base64'); //파일 디코딩

    const params = {
        Bucket: 'carryon-pic',
        Key: `images/${new Date().toISOString()}.jpeg`,
        Body: decode,
        ContentType: "image/jpeg",
        ACL: "public-read",
    };

      return await s3.upload(params).promise();
};