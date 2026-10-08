import { Canvas, useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Mesh } from 'three';

// Setup smoke test: proves R3F + expo-gl render in Expo Go.
// Replaced by the tutorial board in step 4.
function SpinningTile() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <mesh ref={ref} rotation={[0.5, 0, 0]}>
      <boxGeometry args={[1.6, 0.4, 1.6]} />
      <meshStandardMaterial color="#9ad7c4" />
    </mesh>
  );
}

export default function TutorialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Glowire</Text>
      <Canvas style={styles.canvas} camera={{ position: [0, 2, 4] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <SpinningTile />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6efe6' },
  title: { marginTop: 72, textAlign: 'center', fontSize: 28, fontWeight: '700', color: '#4a4058' },
  canvas: { flex: 1 },
});
