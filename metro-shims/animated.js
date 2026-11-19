// react-native-web's Animated minus the FlatList/SectionList wrappers (they pull in the whole virtualized list). Web only.
import Platform from 'react-native-web/dist/exports/Platform';
import Image from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedImage';
import ScrollView from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedScrollView';
import Text from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedText';
import View from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedView';
import AnimatedMock from 'react-native-web/dist/vendor/react-native/Animated/AnimatedMock';
import AnimatedImplementation from 'react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation';

const Animated = Platform.isTesting ? AnimatedMock : AnimatedImplementation;
export default { Image, ScrollView, Text, View, ...Animated };
