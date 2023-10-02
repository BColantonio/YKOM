// store/authActions.js
export const loginSuccess = (user) => ({
    type: 'LOGIN_SUCCESS',
    payload: user,
  });
  
export const logoutSuccess = () => ({
type: 'LOGOUT_SUCCESS',
});

export const signUpSuccess = (user) => ({
    type: 'SIGNUP_SUCCESS',
    payload: user,
  });
  
export const signUpFailure = () => ({
type: 'SIGNUP_FAILURE',
});
  
  // You can add more actions like login failure, registration, etc.
  