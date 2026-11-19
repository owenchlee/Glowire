const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Web never uses reanimated (optional peer of gesture-handler, screens, router, expo-gl): stub it out, saves ~636 KB.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && /^react-native-reanimated(\/|$)/.test(moduleName)) {
    return { type: 'empty' };
  }
  // Orientation is only locked on native (see app/_layout.tsx).
  if (platform === 'web' && moduleName === 'expo-screen-orientation') {
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
  // expo-router's Head wraps react-helmet-async; the game never sets head tags.
  if (platform === 'web' && moduleName === './ExpoHead' && /expo-router[\/\\]build[\/\\]head[\/\\]/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'expo-head.js') };
  }
  // The iOS-only link preview is never rendered on web.
  if (platform === 'web' && moduleName === './LinkWithPreview' && /expo-router[\/\\]build[\/\\]link[\/\\]/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'link-with-preview.js') };
  }
  // The iOS-only link preview content is never rendered on web.
  if (platform === 'web' && moduleName === './preview/HrefPreview' && /expo-router[\/\\]build[\/\\]link[\/\\]elements\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'href-preview.js') };
  }
  // The dev/empty-route toast is never shown.
  if (platform === 'web' && moduleName === './Toast' && /expo-router[\/\\]build[\/\\]views[\/\\]/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'toast.js') };
  }
  // The dev sitemap screen is never shown.
  if (platform === 'web' && moduleName === './views/Sitemap' && /expo-router[\/\\]build[\/\\][^\/\\]*$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'sitemap.js') };
  }
  // Static-config helpers are never called by file-based routing.
  if (platform === 'web' && moduleName === './StaticNavigation' && /expo-router[\/\\]build[\/\\]react-navigation[\/\\]core[\/\\]index\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'static-navigation.js') };
  }
  // The header search bar is never shown (headers are hidden).
  if (platform === 'web' && moduleName === './HeaderSearchBar' && /expo-router[\/\\]build[\/\\]react-navigation[\/\\]elements[\/\\]Header[\/\\]Header\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'header-search-bar.js') };
  }
  // Web-only: react-native-web's lists (~100 KB, unused) and the Animated wrappers that drag them in.
  const shim = platform === 'web' && /^react-native-web\/dist\/exports\/(Animated|FlatList|SectionList|VirtualizedList)$/.exec(moduleName);
  if (shim) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', shim[1] === 'Animated' ? 'animated.js' : 'unused-list.js') };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
