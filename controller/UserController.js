const fs = require('fs').promises;
const fsSync = require('fs'); // For synchronous folder checks
const path = require('path');
const tesseract = require('node-tesseract-ocr');
const { fromPath } = require("pdf2pic");
const ocrSpaceApi = require('ocr-space-api-wrapper'); // For OCR.space API
const File = require('../models/file'); // Adjust the path as needed
const axios = require('axios');
//const api_key = "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";
const api_key = "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"
const Anthropic = require('@anthropic-ai/sdk');

// Instantiate the client with your API key.


// Ensure the temporary folder for PDF conversion exists
const tempImagesFolder = path.join(__dirname, '..', 'temp_images');
if (!fsSync.existsSync(tempImagesFolder)) {
  fsSync.mkdirSync(tempImagesFolder, { recursive: true });
}

// Choose the OCR method: "tesseract" (default) or "ocrspace"
const OCR_METHOD = process.env.OCR_METHOD || 'tesseract';



module.exports = {
  async addDetails(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: "NOK", error: "No file found" });
      }
      
      // Create a new file record using the File model
      const newFile = new File({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedAt: new Date()
      });
      
      // Save the file record to the database
      const savedFile = await newFile.save();
      
      // Return the saved file metadata as response
      res.status(200).json({ status: "OK", file: savedFile });
    } catch (error) {
      res.status(500).json({ status: "NOK", error: error.message });
    }
  },
  
  async getDetails(req, res) {
    try {
      // Retrieve all file records from the database
      const files = await File.find({});
      
      // Process each file record
      const filesWithContent = await Promise.all(
        files.map(async (fileRecord) => {
          let content = "";
          try {
            if (fileRecord.mimetype === "application/json") {
              // Read JSON file and parse it
              const jsonText = await fs.readFile(fileRecord.path, 'utf8');
              content = JSON.parse(jsonText);
            } else if (fileRecord.mimetype.startsWith("text/")) {
              // Read plain text files
              content = await fs.readFile(fileRecord.path, 'utf8');
            } else if (fileRecord.mimetype.startsWith("image/")) {
              // Use OCR for image files
              if (OCR_METHOD === 'tesseract') {
                const ocrConfig = {
                  lang: 'eng',
                  oem: 1,
                  psm: 3, // Adjust if needed (try psm: 6 for a single uniform block)
                };
                console.log(`Running Tesseract OCR on image: ${fileRecord.path}`);
                content = await tesseract.recognize(fileRecord.path, ocrConfig);
                console.log(`Tesseract OCR result: ${content}`);
              } else if (OCR_METHOD === 'ocrspace') {
                const ocrOptions = {
                  apikey: process.env.OCRSPACE_API_KEY || 'helloworld',
                  language: 'eng',
                };
                console.log(`Running OCR.space API on image: ${fileRecord.path}`);
                const ocrResult = await ocrSpaceApi.parseImageFromLocalFile(fileRecord.path, ocrOptions);
                content = (ocrResult.ParsedResults && ocrResult.ParsedResults[0] && ocrResult.ParsedResults[0].ParsedText)
                  ? ocrResult.ParsedResults[0].ParsedText
                  : "No text detected";
                console.log(`OCR.space result: ${content}`);
              }
            } else if (fileRecord.mimetype === "application/pdf") {
              // For PDFs: convert the first page to an image then run OCR
              const pdf2picOptions = {
                density: 100,
                saveFilename: "temp", // temporary filename prefix
                savePath: tempImagesFolder, // our ensured folder
                format: "png",
                width: 600,
                height: 800
              };
              const converter = fromPath(fileRecord.path, pdf2picOptions);
              console.log(`Converting PDF to image: ${fileRecord.path}`);
              const imageResponse = await converter(1);
              console.log(`PDF converted to image at: ${imageResponse.path}`);
              
              if (OCR_METHOD === 'tesseract') {
                const ocrConfig = {
                  lang: 'eng',
                  oem: 1,
                  psm: 3,
                };
                content = await tesseract.recognize(imageResponse.path, ocrConfig);
                console.log(`Tesseract OCR result for PDF: ${content}`);
              } else if (OCR_METHOD === 'ocrspace') {
                const ocrOptions = {
                  apikey: process.env.OCRSPACE_API_KEY || 'helloworld',
                  language: 'eng',
                };
                const ocrResult = await ocrSpaceApi.parseImageFromLocalFile(imageResponse.path, ocrOptions);
                content = (ocrResult.ParsedResults && ocrResult.ParsedResults[0] && ocrResult.ParsedResults[0].ParsedText)
                  ? ocrResult.ParsedResults[0].ParsedText
                  : "No text detected";
                console.log(`OCR.space result for PDF: ${content}`);
              }
              // Optionally remove the temporary image file after OCR is complete:
              // await fs.unlink(imageResponse.path);
            } else {
              // For other file types, return Base64 encoding
              const fileBuffer = await fs.readFile(fileRecord.path);
              content = fileBuffer.toString('base64');
            }
          } catch (err) {
            console.error("Error processing file:", err);
            content = "Error processing file content";
          }
          return { ...fileRecord.toObject(), content };
        })
      );
      
      res.status(200).json({ status: "OK", files: filesWithContent });
    } catch (error) {
      res.status(500).json({ status: "NOK", error: error.message });
    }
  },





// Create an async function to request a completion from the API.
async  getDatafromai(req,res) {
  try {
    const { data } = req.body;
     if (!data) {
          return res.status(400).json({ error: "data field is required." });
        }    // Build the payload using the SDK's messages format.

        const client = new Anthropic.Anthropic({
          apiKey: api_key, // Replace with your actual API key.
        });
    const message = await client.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 20000,
      temperature: 1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
             text:`${data}\n\nYou are an AI assistant specializing in industrial energy analysis and solar energy adoption recommendations. Your task is to analyze the provided industrial energy consumption data and create a comprehensive report with recommendations for solar energy adoption.
  
  First, review the industrial energy data provided above.
  
  Please follow these steps to complete your analysis. For each step, wrap your thought process inside <thought_process> tags before providing the final output for that step.
  
  1. Bill Analysis:
     Inside <thought_process> tags:
     - List out key metrics from the industrial electricity bills, including total consumption, peak/off-peak usage, and cost per unit.
     - Note any patterns or trends you observe in the billing data.
     - Highlight any unusual spikes or dips in energy consumption.
     Provide a brief summary of your findings from the bill analysis.
  
  2. Hourly Usage Calculation:
     Inside <thought_process> tags:
     - List out hourly energy consumption patterns for the entire month.
     - Calculate and note the average energy usage per hour.
     - Identify and list peak usage hours and any patterns in consumption.
     - Consider possible consumer behaviors affecting these patterns.
     Present a clear breakdown of hourly usage, including the average consumption per hour and any notable patterns or peak usage times.
  
  3. Solar Panel Comparison:
     Inside <thought_process> tags:
     - Use the provided solar panel specifications and location information to simulate potential solar power generation. List out key factors and assumptions.
     - Compare this potential output against the calculated hourly consumption, noting any discrepancies or matches.
     - Calculate and list the monthly cost savings by offsetting grid electricity with solar power.
     - Consider and list factors that might affect solar panel efficiency or output in this specific case.
     Present your findings on potential solar energy output, cost savings, and how well it matches the facility's energy needs.
  
  4. Environmental Impact Report:
     Inside <thought_process> tags:
     - Calculate and list the potential reduction in carbon footprint by adopting solar energy.
     - Research and list other environmental benefits of solar adoption for this specific case.
     - Calculate and note the equivalent reduction in fossil fuel usage or other relevant metrics.
     Provide a clear report on the environmental benefits of solar adoption, including specific metrics and comparisons where possible.
  
  5. Final Summary and Recommendations:
     Inside <thought_process> tags:
     - List key points from all the data and analyses from the previous steps.
     - Note financial, operational, and environmental aspects of solar adoption for this facility.
     - List any potential challenges or areas that require further investigation.
     - Develop and list clear, actionable recommendations based on your analysis.
     Compile your final summary and recommendations within <analysis_report> tags. Your report should include:
     - A brief overview of the current energy consumption situation
     - Key findings from each analysis step
     - Clear recommendations on whether the industrial facility should adopt solar energy
     - Suggested next steps or additional considerations for optimizing energy usage
  
  Ensure that your report is well-structured, easy to read, and provides actionable insights for decision-makers.`
  
            }
          ]
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "<thought_process>"
            }
          ]
        }
      ]
    });
    
    // Print out the message content (the AI's response)
    console.log(message)
   return res.status(200).json({ message: message });
       } catch (error) {
         console.error("Error:", error.response ? error.response.data : error.message);
         res
           .status(500)
          .json({ error: error.response ? error.response.data : error.message });
      }
}

// Run the async function

  // async  getDatafromai(req, res) {
  //   try {
  //     // Get data from the user
  //     const { data } = req.body;
  //     if (!data) {
  //       return res.status(400).json({ error: "data field is required." });
  //     }
  
  //     // Build the full prompt by combining the user data with your instructions
  //     const promptText = `${data}\n\nYou are an AI assistant specializing in industrial energy analysis and solar energy adoption recommendations. Your task is to analyze the provided industrial energy consumption data and create a comprehensive report with recommendations for solar energy adoption.
  
  // First, review the industrial energy data provided above.
  
  // Please follow these steps to complete your analysis. For each step, wrap your thought process inside <thought_process> tags before providing the final output for that step.
  
  // 1. Bill Analysis:
  //    Inside <thought_process> tags:
  //    - List out key metrics from the industrial electricity bills, including total consumption, peak/off-peak usage, and cost per unit.
  //    - Note any patterns or trends you observe in the billing data.
  //    - Highlight any unusual spikes or dips in energy consumption.
  //    Provide a brief summary of your findings from the bill analysis.
  
  // 2. Hourly Usage Calculation:
  //    Inside <thought_process> tags:
  //    - List out hourly energy consumption patterns for the entire month.
  //    - Calculate and note the average energy usage per hour.
  //    - Identify and list peak usage hours and any patterns in consumption.
  //    - Consider possible consumer behaviors affecting these patterns.
  //    Present a clear breakdown of hourly usage, including the average consumption per hour and any notable patterns or peak usage times.
  
  // 3. Solar Panel Comparison:
  //    Inside <thought_process> tags:
  //    - Use the provided solar panel specifications and location information to simulate potential solar power generation. List out key factors and assumptions.
  //    - Compare this potential output against the calculated hourly consumption, noting any discrepancies or matches.
  //    - Calculate and list the monthly cost savings by offsetting grid electricity with solar power.
  //    - Consider and list factors that might affect solar panel efficiency or output in this specific case.
  //    Present your findings on potential solar energy output, cost savings, and how well it matches the facility's energy needs.
  
  // 4. Environmental Impact Report:
  //    Inside <thought_process> tags:
  //    - Calculate and list the potential reduction in carbon footprint by adopting solar energy.
  //    - Research and list other environmental benefits of solar adoption for this specific case.
  //    - Calculate and note the equivalent reduction in fossil fuel usage or other relevant metrics.
  //    Provide a clear report on the environmental benefits of solar adoption, including specific metrics and comparisons where possible.
  
  // 5. Final Summary and Recommendations:
  //    Inside <thought_process> tags:
  //    - List key points from all the data and analyses from the previous steps.
  //    - Note financial, operational, and environmental aspects of solar adoption for this facility.
  //    - List any potential challenges or areas that require further investigation.
  //    - Develop and list clear, actionable recommendations based on your analysis.
  //    Compile your final summary and recommendations within <analysis_report> tags. Your report should include:
  //    - A brief overview of the current energy consumption situation
  //    - Key findings from each analysis step
  //    - Clear recommendations on whether the industrial facility should adopt solar energy
  //    - Suggested next steps or additional considerations for optimizing energy usage
  
  // Ensure that your report is well-structured, easy to read, and provides actionable insights for decision-makers.`;
  
  //     // Build payload using the prompt field
  //     const payload = {
  //       model: "claude-3-7-sonnet-20250219",
  //       max_tokens_to_sample: 20000,
  //       temperature: 1,
  //       prompt: promptText,
  //     };
  
  //     const response = await axios.post(
  //       "https://api.anthropic.com/v1/complete",
  //       payload,
  //       {
  //         headers: {
  //           "Content-Type": "application/json",
  //           "x-api-key": api_key,
  //           "anthropic-version": "2023-06-01",
  //         },
  //       }
  //     );
  
  //     // Assuming the completion is returned in response.data.completion
  //     res.status(200).json({ message: response.data.completion });
  //   } catch (error) {
  //     console.error("Error:", error.response ? error.response.data : error.message);
  //     res
  //       .status(500)
  //       .json({ error: error.response ? error.response.data : error.message });
  //   }
  // }
  
  
  
  
}

