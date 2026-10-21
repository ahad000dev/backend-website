const crypto = require("crypto")

const parseCookies = (header = "") => Object.fromEntries(
  header.split(";").map(item => item.trim().split(/=(.*)/s)).filter(([key]) => key).map(([key, value]) => [key, decodeURIComponent(value || "")])
)

const cookieOptions = {
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
}

function issueCsrfToken(req, res, next) {
  const cookies = parseCookies(req.headers.cookie)
  if (!cookies["XSRF-TOKEN"]) res.cookie("XSRF-TOKEN", crypto.randomBytes(32).toString("hex"), cookieOptions)
  next()
}

function requireCsrfToken(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next()
  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies["XSRF-TOKEN"]
  const headerToken = req.get("X-CSRF-Token")
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ message: "Invalid or missing CSRF token" })
  }
  next()
}

module.exports = { cookieOptions, issueCsrfToken, requireCsrfToken, parseCookies }
