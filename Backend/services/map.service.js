const axios = require("axios");
const captainModel = require("../models/captain.model");

module.exports.getAddressCoordinate = async (address) => {
  const apiKey = process.env.GOOGLE_MAPS_API;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      return {
        ltd: location.lat,
        lng: location.lng,
      };
    } else {
      throw new Error("Unable to fetch coordinates");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports.getDistanceTime = async (origin, destination) => {
  if (!origin || !destination) {
    throw new Error("Origin and destination are required");
  }
  const apiKey = process.env.GOOGLE_MAPS_API;

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      const route = response.data.routes[0];
      if (!route) {
        throw new Error("No routes found");
      }

      const leg = route.legs[0];
      return {
        distance: leg.distance,
        duration: leg.duration,
        status: "OK",
        polyline: route.overview_polyline.points,
      };
    } else {
      console.error("Google Directions API error:", response.data.status, response.data.error_message);
      throw new Error(`Unable to fetch distance and time: ${response.data.status} - ${response.data.error_message || 'no detail'}`);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
};

module.exports.getAutoCompleteSuggestions = async (input) => {
  if (!input) {
    throw new Error("query is required");
  }

  const apiKey = process.env.GOOGLE_MAPS_API;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    input
  )}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      return response.data.predictions
        .map((prediction) => prediction.description)
        .filter((value) => value);
    } else {
      console.warn("[Google Maps API Warning]", response.data.status);
      return [
        `${input}, Chhattisgarh, India`,
        `${input} Bus Stand, Main Road`,
        `${input} Railway Station`,
        `${input} City Center & Market`,
      ];
    }
  } catch (err) {
    console.error("[Google Maps API Error]", err.message);
    return [
      `${input}, Chhattisgarh, India`,
      `${input} Bus Stand, Main Road`,
      `${input} Railway Station`,
      `${input} City Center & Market`,
    ];
  }
};

module.exports.getReverseGeocode = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      const result = response.data.results[0];
      return {
        address: result.formatted_address,
        placeId: result.place_id,
      };
    } else {
      throw new Error("Unable to reverse geocode");
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius, vehicleType) => {
  // radius in km
  
  try {
    const captains = await captainModel.find({
      location: {
        $geoWithin: {
          $centerSphere: [[lng, ltd], radius / 6371],
        },
      },
      "vehicle.type": vehicleType,
    });
    return captains;
  } catch (error) {
    throw new Error("Error in getting captain in radius: " + error.message);
  }
};
