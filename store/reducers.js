// store/reducers.js
import { combineReducers } from 'redux';
import authReducer from './reducers/authReducer'; // Import your auth reducer here

const rootReducer = combineReducers({
  auth: authReducer,
  // Add more reducers for other parts of your app if needed
});

export default rootReducer;
