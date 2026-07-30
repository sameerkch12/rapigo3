const captainModel = require("../models/captain.model");
const rideModel = require("../models/ride.model");
const mapService = require("./map.service");
const crypto = require("crypto");

const getFare = async (pickup, destination) => {
  if (!pickup || !destination) {
    throw new Error("Pickup and destination are required");
  }

  const distanceTime = await mapService.getDistanceTime(pickup, destination);

  const baseFare = {
    auto: 30,
    car: 50,
    bike: 20,
  };

  const perKmRate = {
    auto: 10,
    car: 15,
    bike: 8,
  };

  const perMinuteRate = {
    auto: 2,
    car: 3,
    bike: 1.5,
  };

  const fare = {
    auto: Math.round(
      baseFare.auto +
        (distanceTime.distance.value / 1000) * perKmRate.auto +
        (distanceTime.duration.value / 60) * perMinuteRate.auto
    ),
    car: Math.round(
      baseFare.car +
        (distanceTime.distance.value / 1000) * perKmRate.car +
        (distanceTime.duration.value / 60) * perMinuteRate.car
    ),
    bike: Math.round(
      baseFare.bike +
        (distanceTime.distance.value / 1000) * perKmRate.bike +
        (distanceTime.duration.value / 60) * perMinuteRate.bike
    ),
  };

  return { fare, distanceTime, polyline: distanceTime.polyline };
};

module.exports.getFare = getFare;

function getOtp(num) {
  return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
}

module.exports.createRide = async ({
  user,
  pickup,
  destination,
  vehicleType,
}) => {
  if (!user || !pickup || !destination || !vehicleType) {
    throw new Error("All fields are required");
  }

  try {
    const { fare, distanceTime } = await getFare(pickup, destination);

    // Geocode both ends so we can restore map markers on cold start.
    // Failure here must not block ride creation.
    let pickupCoords;
    let destinationCoords;
    try {
      const [p, d] = await Promise.all([
        mapService.getAddressCoordinate(pickup),
        mapService.getAddressCoordinate(destination),
      ]);
      pickupCoords = { lat: p.ltd, lng: p.lng };
      destinationCoords = { lat: d.ltd, lng: d.lng };
    } catch (geoErr) {
      console.warn("Ride geocoding failed:", geoErr.message);
    }

    const ride = await rideModel.create({
      user,
      pickup,
      destination,
      pickupCoords,
      destinationCoords,
      otp: getOtp(6),
      fare: fare[vehicleType],
      vehicle: vehicleType,
      distance: distanceTime.distance.value,
      duration: distanceTime.duration.value,
    });

    return ride;
  } catch (error) {
    // ✅ FIX 5: Asli error propagate karo — debugging ke liye zaroori hai
    throw new Error("Error occured while creating ride: " + error.message);
  }
};

// when ride request is accepted by captain
module.exports.confirmRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  try {
    const ride = await rideModel.findOneAndUpdate(
      {
        _id: rideId,
        status: "pending",
      },
      {
        status: "accepted",
        captain: captain._id,
      },
      { new: true }
    )
      .populate("user")
      .populate("captain")
      .select("+otp");

    if (!ride) {
      throw new Error("Ride is no longer available");
    }

    const captainData = await captainModel.findOne({ _id: captain._id });

    if (captainData && !captainData.rides.some((ride) => ride.toString() === rideId.toString())) {
      captainData.rides.push(rideId);
      await captainData.save();
    }

    return ride;
  } catch (error) {
    console.log(error);
    if (error.message === "Ride is no longer available") {
      throw error;
    }
    // ✅ FIX 5: Asli error propagate karo
    throw new Error("Error occured while confirming ride: " + error.message);
  }
};

module.exports.startRide = async ({ rideId, otp, captain }) => {
  if (!rideId || !otp) {
    throw new Error("Ride id and OTP are required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
    })
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "accepted") {
    throw new Error("Ride not accepted");
  }

  if (ride.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  const updatedRide = await rideModel.findOneAndUpdate(
    {
      _id: rideId,
    },
    {
      status: "ongoing",
    },
    { new: true }
  ).populate("user").populate("captain");

  return updatedRide;
};

module.exports.endRide = async ({ rideId, captain }) => {
  if (!rideId) {
    throw new Error("Ride id is required");
  }

  const ride = await rideModel
    .findOne({
      _id: rideId,
      captain: captain._id,
    })
    .populate("user")
    .populate("captain")
    .select("+otp");

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.status !== "ongoing") {
    throw new Error("Ride not ongoing");
  }

  const updatedRide = await rideModel.findOneAndUpdate(
    {
      _id: rideId,
    },
    {
      status: "completed",
    },
    { new: true }
  ).populate("user").populate("captain");

  return updatedRide;
};
