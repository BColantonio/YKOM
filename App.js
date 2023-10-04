import * as React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Header from './components/header';
import LogInScreen from './screens/login';
import { globalStyles } from './styles/global';

function App() {
  return (
    <View style={globalStyles.container}>
      <LogInScreen />
    </View>
  );
}


export default App;
