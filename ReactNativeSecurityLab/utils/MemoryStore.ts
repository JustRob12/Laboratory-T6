// Fallback memory store when secure storage is not available
// SECURITY WARNING: This is less secure and should only be used as a fallback
// for demonstration purposes when Keychain is not available

export const MemoryStore = {
  token: '',
  username: '',
  
  setCredentials(username: string, token: string) {
    this.username = username;
    this.token = token;
    console.log('Stored credentials in memory');
    return true;
  },
  
  getCredentials() {
    if (!this.token || !this.username) return null;
    return {
      username: this.username,
      password: this.token,
      service: 'memorystore'
    };
  },
  
  resetCredentials() {
    this.username = '';
    this.token = '';
    console.log('Cleared credentials from memory');
    return true;
  }
}; 