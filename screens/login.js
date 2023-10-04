import * as React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { globalStyles } from '../styles/global';
import { SignUpScreen } from './signup';

export default function LogInScreen({ navigation }) {
  const handleSignup = () => {
    return (
      <View>
        <SignUpScreen />
      </View>
    )
  }
  return (
    <View style={globalStyles.container}>
      <TextInput
        style={globalStyles.input}
        placeholder="Email"
        onChangeText={this.handleEmail}
      />
      <TextInput
        style={globalStyles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={this.handlePasswordChange}
      />
      <Button title="log in" onPress={this.handleLogin} />
      {/* "Sign Up" link */}
      <Text style={globalStyles.subtext}>or</Text>
      <Button title="sign up" onPress={this.handleSignup} />
    </View>
  );
}
