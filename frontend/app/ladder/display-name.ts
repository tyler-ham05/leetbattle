import type { User } from '../login/controller';

// The name QueueService shows other players: the account name, else the email's first part.
export function displayNameOf(user: Pick<User, 'name' | 'email'>) {
	return user.name?.trim() || user.email.split('@')[0];
}
