const mongoose = require("mongoose");

// Standalone OTP store keyed by phone + role.
// Captains cannot exist as partial documents (vehicle/email are required),
// so unlike the rider flow we can't stash the OTP on the captain doc during
// send-otp. This collection holds the pending OTP until it's verified.
const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "captain"],
      default: "captain",
    },
    otp: {
      type: String,
      required: true,
    },
    otpExpires: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// One active OTP per (phone, role)
otpSchema.index({ phone: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("Otp", otpSchema);
