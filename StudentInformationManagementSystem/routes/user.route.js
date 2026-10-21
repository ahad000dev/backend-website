const express = require('express')
const router = express.Router()
const User = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
const { cookieOptions } = require("../middleware/csrf")
dotenv.config()
router.post('/register', async(req,res)=>{
    try{
        const {username,email,password} = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Username, email, and password are required" })
        }
        const existingUser = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] })
        if (existingUser) {
           return res.status(409).json({ message:"Username or email already exists" })
        }
        const hashPass = await bcrypt.hash(password,10)
        const user = new User({ username, email, password: hashPass })
        const saveUser = await user.save()
        res.status(201).json({ message: "Registration successful", user: { id: saveUser._id, username: saveUser.username, email: saveUser.email } })
    }
    catch(err){
        res.status(500).json({message:err.message})
    }
})
router.post('/login', async(req,res)=>{
    try{
        const {username,password}=req.body
        if (!username || !password) return res.status(400).json({ message: "Username and password are required" })
        const user = await User.findOne({username})
        if(!user){return res.status(401).json({message:"Invalid username or password"})}
        const isMatch = await bcrypt.compare(password,user.password)
        if(!isMatch){return res.status(401).json({message:"Invalid username or password"}) }
        const token = jwt.sign(
            {userID:user._id,username:user.username},
            process.env.JWY_SCREATE,
            { expiresIn: "8h" }
        )
        res.cookie("auth_token", token, { ...cookieOptions, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 })
        res.json({message: "Login successful"})
    }
    catch(err){
        res.status(500).json({message:err.message})
        
    }
    
})
router.post('/logout', async(req,res)=>{
    res.clearCookie("auth_token", cookieOptions)
    res.json({message: "Logged out successfully"})
    
})
module.exports = router
