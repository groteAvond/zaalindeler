// my-app/main/helpers/user.js
import { addGuest } from './database';

export const addUser = async (userData: any) => {
  try {
    const newUser = await addGuest(userData);
    return newUser;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};