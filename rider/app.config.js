module.exports = ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
    eas: config.extra?.eas || {},
  },
  ios: {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '',
    },
  },
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '',
      },
    },
  },
});
