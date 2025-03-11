const express = require("express");
const bodyParser = require("body-parser");
const db = require("./config/dbConfig");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const app = express();

// const corsOptions = {
//   origin: ['http://localhost:3000/*',"https://ode-spa-backend.onrender.com/*"], // Replace with your actual domain(s)
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,  // if you need to allow credentials (cookies, authorization headers)
// };

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/api", userRoutes);


// Database connection
db.dbConnection()
  .then(() => {
    console.log("Database connection established");

    // Start your server only after the database connection is established
    app.listen(8082, () => {
      console.log("Server is running on port 8082");
      console.log("Listening to port http://localhost:8082");
    });
  })
  .catch((error) => {
    console.error("Failed to establish database connection:", error);
    process.exit(1); // Exit process if the connection fails
  });