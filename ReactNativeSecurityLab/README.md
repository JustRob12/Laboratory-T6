# React Native Security Testing Lab

This is a deliberately vulnerable React Native application created for security testing purposes. It contains multiple security vulnerabilities in the initial version, which can be discovered through static and dynamic analysis techniques. The repository also contains the secure version with mitigations applied.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio/Emulator or iOS Simulator
- For dynamic analysis: OWASP ZAP or Burp Suite

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   cd ReactNativeSecurityLab
   npm install
   ```
3. Run the application:
   ```
   npm run android  # For Android
   npm run ios      # For iOS (requires macOS)
   npm run web      # For web testing
   ```

## Security Testing Tasks

### 1. Static Analysis

Use tools like SonarQube, ESLint with eslint-plugin-security, or manual code review to identify:

- Hardcoded secrets and API keys
- Insecure use of AsyncStorage for sensitive data
- Vulnerable dependencies
- Missing input validation

#### Sample vulnerable code to look for:

```javascript
// Hardcoded API keys
const API_KEY = "sk_test_51LtEg4W20tVPERFMGkw8lZNJfZkNwcV";

// Insecure AsyncStorage usage
await AsyncStorage.setItem('userToken', response.data.token);
await AsyncStorage.setItem('password', password); // plaintext password
```

### 2. Dynamic Analysis

Configure OWASP ZAP or Burp Suite as a proxy for the React Native app and test for:

- Unencrypted HTTP traffic
- Insecure JWT storage
- Missing SSL pinning
- Debug mode enabled in production

#### Testing procedures:

1. Set up a proxy (ZAP/Burp) on your computer
2. Configure your emulator/device to use the proxy
3. Install the CA certificate from your proxy tool on your test device
4. Run the app and perform actions like login, adding notes, etc.
5. Analyze the intercepted traffic

## Project Documentation

### 1. Risk Assessment

See [RISK_ASSESSMENT.md](./RISK_ASSESSMENT.md) for a detailed analysis of the security vulnerabilities using the DREAD framework.

The risk assessment:
- Identifies and prioritizes security risks
- Provides risk scoring for each vulnerability
- Categorizes vulnerabilities by severity
- Recommends remediation approaches

### 2. Security Mitigations

See [SECURITY.md](./SECURITY.md) for detailed documentation on the security mitigations implemented in the secure version of the app.

Key mitigations include:
- Replacing AsyncStorage with secure storage alternatives
- Implementing HTTPS with SSL pinning
- Adding proper JWT token validation
- Creating environment-aware security controls
- Implementing secure logout procedures

## Comparing Vulnerable vs. Secure Code

This repository contains both the vulnerable and secure versions of the application to facilitate learning:

1. The vulnerable code demonstrates common security issues in mobile applications
2. The secure code shows proper implementation of security best practices

Key security improvements include:

1. **Secure Storage**
   - Replaced AsyncStorage with Keychain and SInfo for encrypted storage

2. **Network Security**
   - Enforcing HTTPS instead of HTTP
   - Implementing SSL certificate pinning

3. **Token Handling**
   - Adding proper JWT validation
   - Checking token expiration

4. **Environment Controls**
   - Using `__DEV__` for environment-specific code
   - Removing hardcoded credentials from production builds

## Vulnerabilities Included

This app deliberately contains several vulnerabilities:

1. **Authentication Issues**
   - Hardcoded credentials (try admin/password123)
   - Insecure JWT handling
   - No token validation or expiration check

2. **Data Storage Issues**
   - Storing sensitive data in AsyncStorage without encryption
   - Plain text storage of credentials and credit card information
   - Incomplete logout process that leaves sensitive data

3. **Network Issues**
   - Using HTTP instead of HTTPS
   - No certificate pinning
   - Sending sensitive data without proper protection

4. **Implementation Issues**
   - Debug flags left on in production code
   - Hardcoded development tokens and API keys
   - No input validation

## Disclaimer

This application is designed to be insecure for educational purposes. Do NOT use any part of the vulnerable code in production applications. The security vulnerabilities are intentional and should only be used in a controlled environment for learning about security testing of mobile applications.
