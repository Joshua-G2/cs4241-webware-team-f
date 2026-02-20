/**
 * Server entry point.
 * Add your backend (e.g. Express) here.
 */
require("dotenv").config();
// server.js snippet
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

app.use(cors()); // Allows your React app to talk to this server

const app = express();
const PORT = 3000;

app.use(cors({
    origin: "https://localhost:3000",
    credentials: true
}));

mongoose.connect('mongodb+srv://mongobongo:mongobongo123@cluster0.dh0fhc8.mongodb.net/');

const DataSchema = new mongoose.Schema({
    // Define fields based on your CSV headers
    name: String,
    value: Number
});
const DataModel = mongoose.model('Data', DataSchema, 'Admission_Activity');

app.get('/api/data', async (req, res) => {
    const allData = await DataModel.find({});
    res.json(allData);
});

app.listen(5000, () => console.log("Server running on port 5000"));