const bcrypt = require('bcrypt');
const saltRounds = 10;

export const hashPasswordHelper = async (plainPassword: string) => {
  try {
    return bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    console.log(error);
  }
};
