const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web never uses reanimated (optional peer of gesture-handler, screens, router, expo-gl): stub it out, saves ~636 KB.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && /^react-native-reanimated(\/|$)/.test(moduleName)) {
    return { type: 'empty' };
  }
  // Router/screens only touch gesture-handler on native paths; keep it for the game's own code.
  if (platform === 'web' && moduleName === 'react-native-gesture-handler' && /node_modules[\/](expo-router|react-native-screens)[\/]/.test(context.originModulePath)) {
    return { type: 'empty' };
  }
  // The package index imports its parts by relative path, so swap the index too.
  if (platform === 'web' && moduleName === 'react-native-web/dist/index' && !/metro-shims/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'index.js') };
  }
  // Web-only: react-native-web's lists (~100 KB, unused) and the Animated wrappers that drag them in.
  const shim = platform === 'web' && /^react-native-web\/dist\/exports\/(Animated|FlatList|SectionList|VirtualizedList)$/.exec(moduleName);
  if (shim) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', shim[1] === 'Animated' ? 'animated.js' : 'unused-list.js') };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
