// react-native-web's Animated minus the FlatList/SectionList wrappers (they pull in the whole virtualized list),
// the Image/ScrollView/Text wrappers (the game only animates View) and the test-only AnimatedMock. Web only.
import View from 'react-native-web/dist/vendor/react-native/Animated/components/AnimatedView';
import AnimatedImplementation from 'react-native-web/dist/vendor/react-native/Animated/AnimatedImplementation';

export default { View, ...AnimatedImplementation };
