// ErrorBoundary only reads the tab-bar height context; the game has no tabs (~300 KB of bottom-tabs). Web only.
exports.BottomTabBarHeightContext = require('react').createContext(undefined);
