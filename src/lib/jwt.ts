import jwt from 'jsonwebtoken';
import { getEnvVariables } from './config';

const { JWT_SECRET } = getEnvVariables();

export const generateJWT = (uid: string, name: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload = { uid, name };

    jwt.sign(
      payload,
      JWT_SECRET,
      {
        expiresIn: '7d',
      },
      (err, token) => {
        if (err) {
          console.log(err);
          reject('No se pudo generar el token');
        } else {
          resolve(token!);
        }
      }
    );
  });
};

export const verifyJWT = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject('Token no válido');
      } else {
        resolve(decoded);
      }
    });
  });
};
