import { createHash, createHmac } from 'node:crypto';

function validateMezonHashWithSecret(appSecret: string, hashData: string): boolean {
  const delimiter = '&hash=';
  const index = hashData.indexOf(delimiter);
  if (index === -1) {
    console.error('No hash delimiter found in hash data');
    return false;
  }

  const queryData = hashData.substring(0, index);
  const receivedHash = hashData.substring(index + delimiter.length);

  const hashedSecret = createHash('md5').update(appSecret).digest('hex');
  const secretKey = createHmac('sha256', hashedSecret).update('WebAppData').digest();
  const computedHash = createHmac('sha256', secretKey).update(queryData).digest('hex');

  return computedHash === receivedHash;
}

export function validateMezonHash(appSecrets: string[], hashData: string): boolean {
  if (appSecrets.length === 0) {
    console.error('No app secrets provided');
    return false;
  }

  try {
    return appSecrets.some((secret) => validateMezonHashWithSecret(secret, hashData));
  } catch (error) {
    console.error('Hash validation error:', error);
    return false;
  }
}