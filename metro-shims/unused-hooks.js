// expo-router hooks the game never calls (useRoutePath, useScrollToTop, useSitemap). Web only.
exports.useRoutePath = exports.useScrollToTop = exports.useSitemap = () => null;
