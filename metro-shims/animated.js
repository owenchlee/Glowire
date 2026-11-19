// react-native-web's Animated minus the FlatList/SectionList wrappers (they pull in the whole virtualized list)
// and the test-only AnimatedMock. Web only.
import Image from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedImage';
import ScrollView from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedScrollView';
import Text from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedText';
import View from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedView';
import AnimatedImplementation from 'react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation';

export default { Image, ScrollView, Text, View, ...AnimatedImplementation };
