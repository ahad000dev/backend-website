const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")
const Student = require("../models/student.model")

const route = express.Router()
const uploadsDirectory = path.join(__dirname, "..", "uploads")
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDirectory),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"))
        cb(null, true)
    },
    limits: { fileSize: 5 * 1024 * 1024 }
})
const isValidId = (id) => mongoose.isObjectIdOrHexString(id)
function removeFile(filename) {
    if (!filename) return
    fs.unlink(path.join(uploadsDirectory, filename), (error) => {
        if (error && error.code !== "ENOENT") console.error("Could not remove upload:", error.message)
    })
}
route.get("/", async (req, res) => {
    try {
        const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1)
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 100)
        const search = String(req.query.search || "").trim()
        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const query = safeSearch ? { name: { $regex: safeSearch, $options: "i" } } : {}
        const total = await Student.countDocuments(query)
        const totalPage = Math.ceil(total / limit)
        const page = totalPage ? Math.min(requestedPage, totalPage) : 1
        const skip = (page - 1) * limit
        const student = await Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        res.json({
            total,
            page,
            limit,
            totalPage,
            student
        })

    } catch { res.status(500).json({ message: "Could not fetch students" }) }
})
route.get("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid student ID" })
    try {
        const student = await Student.findById(req.params.id)
        if (!student) return res.status(404).json({ message: "Student not found" })
        res.json(student)
    } catch { res.status(500).json({ message: "Could not fetch student" }) }
})
route.post("/", upload.single("profile_pic"), async (req, res) => {
    try {
        const student = await Student.create({ ...req.body, profile_pic: req.file?.filename })
        res.status(201).json(student)
    } catch (error) {
        removeFile(req.file?.filename)
        res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email already exists" : error.message })
    }
})
route.put("/:id", upload.single("profile_pic"), async (req, res) => {
    if (!isValidId(req.params.id)) {
        removeFile(req.file?.filename)
        return res.status(400).json({ message: "Invalid student ID" })
    }
    try {
        const existingStudent = await Student.findById(req.params.id)
        if (!existingStudent) {
            removeFile(req.file?.filename)
            return res.status(404).json({ message: "Student not found" })
        }
        const update = { ...req.body }
        if (req.file) update.profile_pic = req.file.filename
        const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
        if (req.file) removeFile(existingStudent.profile_pic)
        res.json(student)
    } catch (error) {
        removeFile(req.file?.filename)
        res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email already exists" : error.message })
    }
})
route.delete("/:id", async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid student ID" })
    try {
        const student = await Student.findByIdAndDelete(req.params.id)
        if (!student) return res.status(404).json({ message: "Student not found" })
        removeFile(student.profile_pic)
        res.status(204).end()
    } catch { res.status(500).json({ message: "Could not delete student" }) }
})
module.exports = route
