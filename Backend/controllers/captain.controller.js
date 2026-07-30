const asyncHandler = require("express-async-handler");
const captainModel = require("../models/captain.model");
const captainService = require("../services/captain.service");
const otpModel = require("../models/otp.model");
const otpService = require("../services/otp.service");
const { validationResult } = require("express-validator");
const blacklistTokenModel = require("../models/blacklistToken.model");
const jwt = require("jsonwebtoken");

module.exports.registerCaptain = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array());
  }

  const { fullname, email, password, phone, vehicle } = req.body;

  const alreadyExists = await captainModel.findOne({ email });

  if (alreadyExists) {
    return res.status(400).json({ message: "Captain already exists" });
  }

  const captain = await captainService.createCaptain(
    fullname.firstname,
    fullname.lastname,
    email,
    password,
    phone,
    vehicle.color,
    vehicle.number,
    vehicle.capacity,
    vehicle.type
  );

  const token = captain.generateAuthToken();
  res
    .status(201)
    .json({ message: "Captain registered successfully", token, captain });
});

module.exports.verifyEmail = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array());
  }

  const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Invalid verification link", error: "Token is required" });
    }
  
    let decodedTokenData;
    try {
      decodedTokenData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired verification link", error: err.message });
    }
  
    if (!decodedTokenData || decodedTokenData.purpose !== "email-verification") {
      return res.status(400).json({ message: "You're trying to use an invalid or expired verification link", error: "Invalid token" });
    }
  
    let captain = await captainModel.findOne({ _id: decodedTokenData.id });
  
    if (!captain) {
      return res.status(404).json({ message: "User not found. Please ask for another verification link." });
    }
  
    if (captain.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
  
    captain.emailVerified = true;
    await captain.save();
  
    res.status(200).json({
      message: "Email verified successfully",
    });
});

module.exports.loginCaptain = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array());
  }

  const { email, password } = req.body;

  const captain = await captainModel.findOne({ email }).select("+password");
  if (!captain) {
    return res.status(404).json({ message: "Invalid email or password" });
  }

  const isMatch = await captain.comparePassword(password);

  if (!isMatch) {
    return res.status(404).json({ message: "Invalid email or password" });
  }

  const token = captain.generateAuthToken();
  res.cookie("token", token);
  res.json({ message: "Logged in successfully", token, captain });
});

module.exports.captainProfile = asyncHandler(async (req, res) => {
  res.status(200).json({ captain: req.captain });
});

module.exports.updateCaptainProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array());
  }

  const { captainData } = req.body;
  const updatedCaptainData = await captainModel.findOneAndUpdate(
    { email: req.captain.email },
    captainData,
    { new: true }
  );

  res.status(200).json({
    message: "Profile updated successfully",
    user: updatedCaptainData,
  });
});

module.exports.logoutCaptain = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  const token = req.cookies.token || req.headers.token;

  await blacklistTokenModel.create({ token });

  res.status(200).json({ message: "Logged out successfully" });
});

module.exports.sendCaptainOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors.array());

  const { phone } = req.body;
  const otpResult = await otpService.sendOtpSms(phone);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await otpModel.findOneAndUpdate(
    { phone, role: "captain" },
    { otp: otpResult.otp, otpExpires },
    { upsert: true, new: true }
  );

  res.status(200).json({
    message: otpResult.message,
    isDemo: otpResult.isDemo,
    ...(otpResult.isDemo ? { otp: otpResult.otp } : {}),
  });
});

module.exports.verifyCaptainOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors.array());

  const { phone, otp } = req.body;

  const record = await otpModel.findOne({ phone, role: "captain" });
  if (!record || !record.otp || !record.otpExpires) {
    return res.status(400).json({ message: "OTP not requested or expired. Please request a new OTP." });
  }
  if (record.otpExpires < new Date()) {
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP. Please enter the correct code." });
  }

  await otpModel.deleteOne({ phone, role: "captain" });

  const captain = await captainModel.findOne({ phone });
  const isProfileComplete = Boolean(captain?.fullname?.firstname && captain?.email && captain?.vehicle?.type);

  if (isProfileComplete) {
    const token = captain.generateAuthToken();
    res.cookie("token", token);
    return res.status(200).json({
      message: "Logged in successfully",
      isNewCaptain: false,
      token,
      captain,
    });
  }

  return res.status(200).json({
    message: "OTP verified. Profile registration required.",
    isNewCaptain: true,
    phone,
  });
});

module.exports.registerPhoneCaptain = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json(errors.array());

  const { phone, fullname, email, vehicle } = req.body;

  const existingEmail = await captainModel.findOne({ email });
  if (existingEmail && existingEmail.phone !== phone) {
    return res.status(400).json({ message: "Email is already registered with another account" });
  }

  let captain = await captainModel.findOne({ phone });
  if (!captain) {
    captain = new captainModel({ phone });
  }

  captain.fullname = { firstname: fullname.firstname, lastname: fullname.lastname || "" };
  captain.email = email;
  captain.vehicle = {
    color: vehicle.color,
    number: vehicle.number,
    capacity: vehicle.capacity,
    type: vehicle.type,
  };

  await captain.save();

  const token = captain.generateAuthToken();
  res.cookie("token", token);

  res.status(201).json({
    message: "Captain profile completed & registered successfully",
    isNewCaptain: false,
    token,
    captain,
  });
});

module.exports.resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(errors.array());
  }

  const { token, password } = req.body;
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ message: "This password reset link has expired or is no longer valid. Please request a new one to continue" });
    } else {
      return res.status(400).json({ message: "The password reset link is invalid or has already been used. Please request a new one to proceed", error: err });
    }
  }

  const captain = await captainModel.findById(payload.id);
  if (!captain) return res.status(404).json({ message: "User not found. Please check your credentials and try again" });

  captain.password = await captainModel.hashPassword(password);
  await captain.save();

  res.status(200).json({ message: "Your password has been successfully reset. You can now log in with your new credentials" });
});
