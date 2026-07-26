import React from 'react';

// Minimal test component to verify basic rendering
const TestChangePassword: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Change Password Test</h1>
      <p>If you can see this, the component is rendering correctly!</p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <form>
          <div style={{ marginBottom: '15px' }}>
            <label>Username:</label>
            <input type="text" style={{ marginLeft: '10px', padding: '5px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Current Password:</label>
            <input type="password" style={{ marginLeft: '10px', padding: '5px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>New Password:</label>
            <input type="password" style={{ marginLeft: '10px', padding: '5px' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Confirm Password:</label>
            <input type="password" style={{ marginLeft: '10px', padding: '5px' }} />
          </div>
          <button type="button" style={{ padding: '10px 20px', marginRight: '10px' }}>
            Reset
          </button>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white' }}>
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default TestChangePassword;
