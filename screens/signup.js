import * as React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { globalStyles } from '../styles/global';

export default function SignUpScreen({ navigation }) {
  return (
    <View style={globalStyles.container}>
      <TextInput
        style={globalStyles.input}
        placeholder="Email"
        onChangeText={this.handleEmailChange}
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
      <Button title="sign up" onPress={() => navigation.navigate('sign up')} />
    </View>
  );
}
