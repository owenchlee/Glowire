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
  // Headers are always hidden (headerShown: false), so the header and its back button never render.
  if (platform === 'web' && /^\.\/(Header\/(Header|HeaderBackButton|HeaderBackground|HeaderButton|HeaderTitle)|Badge|Button|MissingIcon|Label\/Label)$/.test(moduleName) && /expo-router[\/\\]build[\/\\]react-navigation[\/\\]elements[\/\\]index\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'header.js') };
  }
  // The game has no native tabs; skip the trigger helpers (and the tab icon code they pull in).
  if (platform === 'web' && moduleName === '../native-tabs/NativeTabTrigger' && /expo-router[\/\\]build[\/\\]layouts[\/\\]withLayoutContext\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'native-tab-trigger.js') };
  }
  // The Tabs / ExperimentalStack layouts are never used (game uses Stack and Slot).
  if (platform === 'web' && (moduleName === './layouts/Tabs' || moduleName === './layouts/experimental-stack') && /expo-router[\/\\]build[\/\\]exports\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'unused-layouts.js') };
  }
  // The Tab/Drawer routers are never used (game uses Stack and Slot); the routers index re-exports them lazily.
  if (platform === 'web' && (moduleName === './TabRouter' || moduleName === './DrawerRouter') && /expo-router[\/\\]build[\/\\]react-navigation[\/\\]routers[\/\\]index\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'unused-layouts.js') };
  }
  // ErrorBoundary pulls the whole bottom-tabs package just for one context; the game has no tabs.
  if (platform === 'web' && moduleName === '../react-navigation/bottom-tabs' && /expo-router[\/\\]build[\/\\]views[\/\\]ErrorBoundary\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'bottom-tabs.js') };
  }
  // The primitives and standard-navigation exports are never used by the game.
  if (platform === 'web' && (moduleName === './primitives' || moduleName === './standard-navigation') && /expo-router[\/\\]build[\/\\]exports\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'unused-navigation.js') };
  }
  // expo-router's Color helpers are never used by the game.
  if (platform === 'web' && moduleName === './color' && /expo-router[\/\\]build[\/\\]index\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'unused-color.js') };
  }
  // Hooks the game never calls; swap them for stubs (the index files re-export them eagerly).
  if (platform === 'web' && /^\.{1,2}\/(.*\/)?(useRoutePath|useScrollToTop|useSitemap)$/.test(moduleName) && /expo-router[\/\\]build[\/\\]/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'unused-hooks.js') };
  }
  // Stack.Toolbar is native header chrome, never used by the game.
  if (platform === 'web' && moduleName === './toolbar' && /expo-router[\/\\]build[\/\\]layouts[\/\\]stack-utils[\/\\](index|StackScreen)\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'stack-toolbar.js') };
  }
  // StyleSheet validation is dev-only; skip it (and postcss-value-parser) in the web bundle.
  if (platform === 'web' && moduleName === './validate' && /react-native-web[\/\\]dist[\/\\]exports[\/\\]StyleSheet[\/\\]index\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'style-validate.js') };
  }
  // Environment maps are never used, so the ~15 KB PMREM generator is dead weight in the renderer.
  if (platform === 'web' && moduleName === '../../extras/PMREMGenerator.js' && /three[\/\\]src[\/\\]renderers[\/\\]webgl[\/\\]WebGLEnvironments\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'pmrem-generator.js') };
  }
  // The game never starts a WebXR session, so the renderer gets an inert manager instead of the ~9 KB real one.
  if (platform === 'web' && moduleName === './webxr/WebXRManager.js' && /three[\/\\]src[\/\\]renderers[\/\\]WebGLRenderer\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'webxr-manager.js') };
  }
  // The HDR output/effects pass is only built for non-default output buffer types, which the game never sets.
  if (platform === 'web' && moduleName === './webgl/WebGLOutput.js' && /three[\/\\]src[\/\\]renderers[\/\\]WebGLRenderer\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'webgl-output.js') };
  }
  // No mesh has morph targets, so the renderer gets an inert updater.
  if (platform === 'web' && moduleName === './webgl/WebGLMorphtargets.js' && /three[\/\\]src[\/\\]renderers[\/\\]WebGLRenderer\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'morphtargets.js') };
  }
  // No light casts shadows, so the renderer gets an inert shadow map.
  if (platform === 'web' && moduleName === './webgl/WebGLShadowMap.js' && /three[\/\\]src[\/\\]renderers[\/\\]WebGLRenderer\.js$/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'shadow-map.js') };
  }
  // Only basic/standard/points/sprite/background shaders are used; the other stock mesh shaders are dropped.
  if (platform === 'web' && /^\.{1,2}\/(shaders\/)?ShaderChunk\.js$/.test(moduleName) && /three[\/\\]src[\/\\]renderers[\/\\]/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'shader-chunk.js') };
  }
  // Web only: a ~55-name subset of three (what the game and fiber use) instead of the whole library.
  if (platform === 'web' && moduleName === 'three') {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'three.js') };
  }
  // Only mergeGeometries is used from BufferGeometryUtils; the trimmed copy drops ~10 KB of unused helpers.
  if (platform === 'web' && moduleName === 'three/examples/jsm/utils/BufferGeometryUtils.js') {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', 'buffer-geometry-utils.js') };
  }
  // Web-only: react-native-web's lists (~100 KB, unused) and the Animated wrappers that drag them in.
  const shim = platform === 'web' && /^react-native-web\/dist\/exports\/(Animated|FlatList|SectionList|VirtualizedList)$/.exec(moduleName);
  if (shim) {
    return { type: 'sourceFile', filePath: require('path').join(__dirname, 'metro-shims', shim[1] === 'Animated' ? 'animated.js' : 'unused-list.js') };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

// Second terser pass shrinks the shipped bundles a little (output stays equivalent).
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  compress: { ...config.transformer.minifierConfig.compress, passes: 2 },
};

module.exports = config;
