// AppNavigator.js
import { createStackNavigator } from 'react-navigation-stack';
import { createAppContainer } from 'react-navigation';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

const AuthNavigator = createStackNavigator(
  {
    Login: LoginScreen,
    SignUp: SignUpScreen
  }
);

export default createAppContainer(AuthNavigator);
