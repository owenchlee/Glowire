// Inert stand-in for react-native-web's FlatList/SectionList/VirtualizedList (the game never renders lists). Web only.
// A function (not an arrow) so gesture-handler's `instanceof FlatList` still works.
function UnusedList() {
  return null;
}
export default UnusedList;
