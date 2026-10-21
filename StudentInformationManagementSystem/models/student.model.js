const mongoose = require("mongoose")
const studentSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim: true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim: true,
        lowercase: true
    },
    phone:{
        type:String,
        required:true,
        trim: true
    },
    gender:{
        type:String,
        enum:["male","female",'other'],
        required:true,
    },
    profile_pic:{
        type:String,
    }
}, { timestamps: true })

module.exports = mongoose.model("Student", studentSchema)
