const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${API_KEY}`;

exports.handler = async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  const mood = body?.mood || "okay";

  const prompt = `I feel ${mood} today. Please generate a personalized mental wellness guide for me that includes:
- 2 journaling prompts
- 1 breathing exercise
- 1 motivational quote
- 1 short wellness activity suggestion

Make it friendly, supportive, and easy to follow.`;

  // Call Gemini
  let guideText = "Default guide if Gemini API fails.";
  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    guideText = response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error.message);
  }

  // Step 2: Generate PDF
  const doc = new PDFDocument();
  const fileName = `wellness_guide_${Date.now()}.pdf`;
  doc.pipe(fs.createWriteStream(fileName));
  doc.fontSize(16).text("MindMuse AI - Personalized Wellness Guide", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(guideText);
  doc.end();

  // Step 3: Return success
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Guide generated using Gemini 1.5 Flash",
      filename: fileName
    })
  };
};
