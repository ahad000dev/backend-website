const mongoose = require("mongoose")
require("dotenv").config()

async function studentDB() {
    const mongoUrl = process.env.MONGOURL
    if (!mongoUrl) throw new Error("MONGOURL is missing from the .env file")
    await mongoose.connect(mongoUrl)
    console.log("Connected to MongoDB")
}

module.exports = studentDB
