// SignUpScreen.js
import React, { Component, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { signUpSuccess } from '../../store/authActions';
import { registerUser } from '../services/AuthService';


const SignUpScreen = () => {
  const [enteredUserCreds, setEnteredUserCreds] = useState({});
  const userCreds = {};

  handleEmailChange = (text) => {
    userCreds.email = text;
  };

  handlePasswordChange = (text) => {
    userCreds.password = text;
  };

  handleConfirmPasswordChange = (text) => {
    userCreds.confirmPassword = text;
  };

  handleSignUp = () => {
    setEnteredUserCreds(userCreds);
    console.log(enteredUserCreds);
  }

  // handleSignUp = async () => {
  //   // Add your sign-up logic here
    
  //   const registrationResult = await registerUser(userData);

  //   if (registrationResult.success) {
  //     // Registration was successful, navigate to the login screen
  //     navigation.navigate('Login');
  //   } else {
  //     // Handle registration error (e.g., display an error message)
  //     setError(registrationResult.error);
  //   }
  //     this.props.signUpSuccess(user);
  //   };

  navigateToLogIn = () => {
    // Use the navigation prop to navigate to the Login screen
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        onChangeText={this.handleEmailChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={this.handlePasswordChange}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        onChangeText={this.handleConfirmPasswordChange}
      />
      <Button title="Sign Up" onPress={this.handleSignUp} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
});

export default SignUpScreen;
