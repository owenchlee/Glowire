// Single import point for R3F so every file shares one copy of its React context.
// iOS / Android: R3F renders through expo-gl.
export { Canvas, useFrame, useThree } from '@react-three/fiber/native';
