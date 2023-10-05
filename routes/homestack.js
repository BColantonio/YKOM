import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../screens/login';
import HomeScreen from '../screens/home';

// Import or replace SettingsScreen with the actual component
// import SettingsScreen from '../screens/settings';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MyTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* Import or replace SettingsScreen */}
      {/* <Tab.Screen name="Settings" component={SettingsScreen} /> */}
    </Tab.Navigator>
  );
}

export default function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        options={{ headerShown: false }}
        name="Login"
        component={LoginScreen}
      />
      <Stack.Screen
        options={{ headerShown: false }}
        name="Home"
        component={MyTabs}
      />
    </Stack.Navigator>
  );
}
