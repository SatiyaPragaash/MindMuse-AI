const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BUCKET_NAME = process.env.BUCKET_NAME;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${GEMINI_API_KEY}`;
const DYNAMO_TABLE = "MoodLogs"; //table name

exports.handler = async (event) => {
  console.log("Lambda invoked with event:", event);

  const method = event.httpMethod || event.requestContext?.http?.method;

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // 🟩 Added GET support
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ message: "CORS preflight OK" })
    };
  }

  // 🟩 NEW: Handle GET request to fetch mood logs from DynamoDB
  if (method === "GET") {
    try {
      const result = await dynamodb.scan({ TableName: DYNAMO_TABLE }).promise();
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(result.Items)
      };
    } catch (err) {
      console.error("❌ Failed to fetch logs:", err.message);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Failed to fetch logs" })
      };
    }
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  const mood = body?.mood || "okay";
  console.log("📥 Mood received:", mood);

  const prompt = `I feel ${mood} today. Please generate a personalized mental wellness guide for me that includes:
- 2 journaling prompts
- 1 breathing exercise
- 1 motivational quote
- 1 short wellness activity suggestion

Make it friendly, supportive, and easy to follow.`;

  let guideText = "Default guide if Gemini API fails.";

  try {
    const response = await axios.post(
      GEMINI_URL,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { "Content-Type": "application/json" } }
    );
    guideText = response.data.candidates[0].content.parts[0].text;
    console.log("Gemini response received.");
  } catch (error) {
    console.error("Error calling Gemini API:", error.message);
  }

  const filename = `wellness_guide_${Date.now()}.pdf`;
  const filePath = `/tmp/${filename}`;
  const s3Key = `guides/${filename}`;

  try {
    console.log("Generating PDF at:", filePath);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(16).text("MindMuse AI - Personalized Wellness Guide", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(guideText);
      doc.end();

      stream.on("finish", () => {
        console.log("PDF generation complete.");
        resolve();
      });
      stream.on("error", (err) => {
        console.error("PDF generation error:", err.message);
        reject(err);
      });
    });

    const fileContent = fs.readFileSync(filePath);
    console.log("📤 Uploading to S3 bucket:", BUCKET_NAME);

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: "application/pdf"
    }).promise();

    console.log("S3 upload successful.");

    const signedUrl = s3.getSignedUrl("getObject", {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: 3600
    });

    console.log("🔑 Signed S3 URL:", signedUrl);

    // Log to DynamoDB
    const logItem = {
      id: uuidv4(),
      mood,
      timestamp: new Date().toISOString(),
      guide_url: signedUrl
    };

    await dynamodb.put({
      TableName: DYNAMO_TABLE,
      Item: logItem
    }).promise();

    console.log("📦 Logged to DynamoDB:", logItem);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // 🟩 Ensure CORS for GET
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        message: "Guide generated, stored, and logged",
        url: signedUrl
      })
    };

  } catch (err) {
    console.error("Error during PDF or S3/DynamoDB process:", err.message);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // 🟩 Ensure CORS for GET
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({
        error: "Something went wrong while generating or uploading the PDF."
      })
    };
  }
};
