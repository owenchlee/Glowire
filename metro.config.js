const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web never uses reanimated (optional peer of gesture-handler, screens, router, expo-gl): stub it out, saves ~636 KB.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && /^react-native-reanimated(\/|$)/.test(moduleName)) {
    return { type: 'empty' };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
