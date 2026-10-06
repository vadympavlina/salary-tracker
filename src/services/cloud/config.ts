/**
 * Firebase web config. These values are public by design (they ship in every web app);
 * access is protected by the Realtime Database rules: salary/$uid is readable and
 * writable only by that signed-in user.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAPjKNpzedSpNf0dghHJLFISPhOmdrczdE',
  authDomain: 'salary-tracker-d3a72.firebaseapp.com',
  databaseURL: 'https://salary-tracker-d3a72-default-rtdb.firebaseio.com',
  projectId: 'salary-tracker-d3a72',
  storageBucket: 'salary-tracker-d3a72.firebasestorage.app',
  messagingSenderId: '121930826781',
  appId: '1:121930826781:web:60b84546a9f45f7adef2f4',
};

/** Root of a user's data in the Realtime Database. */
export const userPath = (uid: string) => `salary/${uid}`;
