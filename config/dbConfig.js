const mongoose = require("mongoose");

async function dbConnection() {
  try {
    // const mongo_url = "mongodb://127.0.0.1:27017/odespa";
    const mongo_url =
      "mongodb+srv://gurubilli:VrOY63wHF4q0F3Z1@cluster0.dlpod.mongodb.net/fileupload";
    await mongoose.connect(mongo_url, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Problem with the code running:", error);
    throw error;
  }
}

module.exports = { dbConnection };
