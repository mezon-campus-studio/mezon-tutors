import { createHash, createHmac } from 'node:crypto';

export function validateMezonHash(appSecret: string, hashData: string) {
  try {
    const delimiter = '&hash=';
    const index = hashData.indexOf(delimiter);
    const queryData = hashData.substring(0, index);
    const receivedHash = hashData.substring(index + delimiter.length);

    const hashedSecret = createHash('md5').update(appSecret).digest('hex');
    const secretKey = createHmac('sha256', hashedSecret).update('WebAppData').digest();
    const computedHash = createHmac('sha256', secretKey).update(queryData).digest('hex');

    return computedHash === receivedHash;
  } catch (error) {
    console.error('Hash validation error:', error);
    return false;
  }
}