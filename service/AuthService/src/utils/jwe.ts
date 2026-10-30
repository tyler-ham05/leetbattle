import { EncryptJWT, jwtDecrypt, JWTPayload } from 'jose';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const TEXT_ENCODED_SECRET = new TextEncoder().encode(process.env.SECRET);
const JWE_ALGORITHM = 'A256CBC-HS512';
const JWE_EXPIRES_IN = '7d';

export interface UserClaims extends JWTPayload {
	id: string;
	email: string;
}

export const encryptJwe = async (id: string, email: string): Promise<string> => {
	return await new EncryptJWT({ id, email })
		.setProtectedHeader({ alg: 'dir', enc: JWE_ALGORITHM })
		.setIssuedAt()
		.setExpirationTime(JWE_EXPIRES_IN)
		.encrypt(TEXT_ENCODED_SECRET);
};

export const decryptJwe = async (token: string): Promise<UserClaims> => {
	const { payload } = await jwtDecrypt(token, TEXT_ENCODED_SECRET);
	return payload as UserClaims;
};
