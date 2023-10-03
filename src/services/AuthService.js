// AuthService.js

const registerUser = async (userData) => {
    try {
      const response = await fetch('your-registration-api-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
  
      if (response.ok) {
        // Registration successful
        return { success: true };
      } else {
        // Registration failed
        const errorData = await response.json();
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      // Network or server error
      return { success: false, error: 'Network error' };
    }
  };
  
  export { registerUser };
  