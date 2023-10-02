// store/reducers/authReducer.js
const initialState = {
    user: null,
    isAuthenticated: false,
  };
  
  const authReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'LOGIN_SUCCESS':
        return {
          ...state,
          user: action.payload,
          isAuthenticated: true,
        };
      case 'LOGOUT_SUCCESS':
        return {
          ...state,
          user: null,
          isAuthenticated: false,
        };
        case 'SIGNUP_SUCCESS':
        return {
          ...state,
          user: action.payload,
          isAuthenticated: true,
        };
      case 'SIGNUP_FAILURE':
        return {
          ...state,
          user: null,
          isAuthenticated: false,
        };
      default:
        return state;
    }
  };
  
  export default authReducer;
  