import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/login';

const Stack = createStackNavigator();

export default function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
      options={{ headerShown: false }}
      name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}