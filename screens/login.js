import * as React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { globalStyles } from '../styles/global';

export default function LogInScreen({ navigation }) {
  return (
    <View style={globalStyles.container}>
      <TextInput
        style={globalStyles.input}
        placeholder="Email"
        onChangeText={console.log('textchange')}
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={console.log('textchange')}
      />
      <Button title="log in" onPress={() => navigation.navigate('Home')} />
      {/* <Text style={globalStyles.subtext}>or</Text> */}
      <Button title="sign up" onPress={console.log('handleSignup')} />
    </View>
  );
}
