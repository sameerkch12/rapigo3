const rideService = require("../services/ride.service");
const { validationResult } = require("express-validator");
const mapService = require("../services/map.service");
const { sendMessageToSocketId, sendMessageToUserId, sendMessageToCaptainId, sendMessageToRoom } = require("../socket");
const rideModel = require("../models/ride.model");
const userModel = require("../models/user.model");

module.exports.chatDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const ride = await rideModel
      .findOne({ _id: id })
      .populate("user", "socketId fullname phone")
      .populate("captain", "socketId fullname phone");

    if (!ride) {
      return res.status(400).json({ message: "Ride not found" });
    }

    // Only the ride's own rider or captain may read participant PII + chat
    const requesterId = req.userType === "user" ? req.user?._id : req.captain?._id;
    const isParticipant =
      ride.user?._id?.toString() === requesterId?.toString() ||
      ride.captain?._id?.toString() === requesterId?.toString();
    if (!isParticipant) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const response = {
      user: {
        socketId: ride.user?.socketId,
        fullname: ride.user?.fullname,
        phone: ride.user?.phone,
        _id: ride.user?._id,
      },
      captain: {
        socketId: ride.captain?.socketId,
        fullname: ride.captain?.fullname,
        phone: ride.captain?.phone,
        _id: ride.captain?._id,
      },
      messages: ride.messages,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports.createRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination, vehicleType } = req.body;

  try {
    const ride = await rideService.createRide({
      user: req.user._id,
      pickup,
      destination,
      vehicleType,
    });

    const user = await userModel.findOne({ _id: req.user._id });
    if (user) {
      user.rides.push(ride._id);
      await user.save();
    }

    res.status(201).json(ride);

    Promise.resolve().then(async () => {
      try {
        const pickupCoordinates = await mapService.getAddressCoordinate(pickup);
        console.log("Pickup Coordinates", pickupCoordinates);

        const captainsInRadius = await mapService.getCaptainsInTheRadius(
          pickupCoordinates.ltd,
          pickupCoordinates.lng,
          4,
          vehicleType
        );

        ride.notifiedCaptains = captainsInRadius.map((captain) => captain._id);
        await ride.save();
        ride.otp = "";

        const rideWithUser = await rideModel
          .findOne({ _id: ride._id })
          .populate("user");

        console.log(
          captainsInRadius.map(
            (ride) => `${ride.fullname.firstname} ${ride.fullname.lastname} `
          )
        );
        // ✅ FIX 2: Removed duplicate sendMessageToSocketId — captain ko ek hi baar notify karo
        captainsInRadius.map((captain) => {
          sendMessageToCaptainId(captain._id, "new-ride", rideWithUser);
        });
      } catch (e) {
        console.error("Background task failed:", e.message);
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.getFare = async (req, res) => {
  console.log("Get Fare Request Query:", req.query);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { pickup, destination } = req.query;

  try {
    const { fare, distanceTime, polyline } = await rideService.getFare(
      pickup,
      destination
    );
    return res.status(200).json({ fare, distanceTime, polyline });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.confirmRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    const rideDetails = await rideModel.findOne({ _id: rideId });

    if (!rideDetails) {
      return res.status(404).json({ message: "Ride not found." });
    }

    switch (rideDetails.status) {
      case "accepted":
        return res
          .status(400)
          .json({
            message:
              "The ride is accepted by another captain before you. Better luck next time.",
          });

      case "ongoing":
        return res
          .status(400)
          .json({
            message: "The ride is currently ongoing with another captain.",
          });

      case "completed":
        return res
          .status(400)
          .json({ message: "The ride has already been completed." });

      case "cancelled":
        return res
          .status(400)
          .json({ message: "The ride has been cancelled." });

      default:
        break;
    }

    const ride = await rideService.confirmRide({
      rideId,
      captain: req.captain,
    });

    // OTP-less copy for anyone other than the rider (captain shares the ride room)
    const rideWithoutOtp = ride.toObject();
    delete rideWithoutOtp.otp;

    // Only the rider gets the OTP (needed to start the ride)
    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-confirmed",
      data: ride,
    });
    sendMessageToUserId(ride.user._id, "ride-confirmed", ride);
    // Room includes the captain — never broadcast the OTP here
    sendMessageToRoom(ride._id.toString(), "ride-confirmed", rideWithoutOtp);

    const notifiedCaptains = rideDetails.notifiedCaptains || [];
    notifiedCaptains.forEach((captainId) => {
      if (captainId.toString() !== req.captain._id.toString()) {
        sendMessageToCaptainId(captainId, "ride-unavailable", {
          rideId: ride._id,
          acceptedBy: req.captain._id,
        });
      }
    });

    return res.status(200).json(rideWithoutOtp);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.startRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId, otp } = req.query;

  try {
    const ride = await rideService.startRide({
      rideId,
      otp,
      captain: req.captain,
    });

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-started",
      data: ride,
    });
    sendMessageToUserId(ride.user._id, "ride-started", ride);
    sendMessageToRoom(ride._id.toString(), "ride-started", ride);

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.endRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.body;

  try {
    const ride = await rideService.endRide({ rideId, captain: req.captain });

    sendMessageToSocketId(ride.user.socketId, {
      event: "ride-ended",
      data: ride,
    });
    sendMessageToUserId(ride.user._id, "ride-ended", ride);
    sendMessageToRoom(ride._id.toString(), "ride-ended", ride);

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.getActiveRideUser = async (req, res) => {
  try {
    const ride = await rideModel
      .findOne({ user: req.user._id, status: { $in: ["pending", "accepted", "ongoing"] } })
      .select("+otp")
      .populate("user", "fullname phone socketId")
      .populate("captain", "fullname phone socketId vehicle location");

    return res.status(200).json({ ride: ride || null });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports.getActiveRideCaptain = async (req, res) => {
  try {
    const ride = await rideModel
      .findOne({ captain: req.captain._id, status: { $in: ["accepted", "ongoing"] } })
      .populate("user", "fullname phone socketId")
      .populate("captain", "fullname phone socketId vehicle location");

    return res.status(200).json({ ride: ride || null });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports.cancelRide = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rideId } = req.query;

  try {
    const ownerFilter = req.userType === "user"
      ? { _id: rideId, user: req.user._id }
      : { _id: rideId, captain: req.captain._id };

    const ride = await rideModel.findOneAndUpdate(
      ownerFilter,
      { status: "cancelled" },
      { new: true }
    )
      .populate("user")
      .populate("captain");

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    try {
      sendMessageToRoom(ride._id.toString(), "ride-cancelled", ride);
      if (ride.user?._id) {
        sendMessageToUserId(ride.user._id, "ride-cancelled", ride);
      }
      if (ride.user?.socketId) {
        sendMessageToSocketId(ride.user.socketId, {
          event: "ride-cancelled",
          data: ride,
        });
      }

      // ✅ FIX 3: Sirf unhi captains ko notify karo jo is ride ke liye notified the
      const notifiedCaptains = ride.notifiedCaptains || [];
      notifiedCaptains.forEach((captainId) => {
        sendMessageToCaptainId(captainId, "ride-cancelled", { rideId: ride._id });
      });
    } catch (e) {
      console.error("Error notifying captains on cancellation:", e);
    }

    return res.status(200).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
