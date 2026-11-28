import type { PublicProfile } from '../../login/controller';

// The name to show for a player: their name, else AuthService's display name (the
// part of the email before the @, as the lobby shows), else that worked out from
// the email (an AuthService from before displayName).
export function shownName(profile: PublicProfile & { email?: string }): string {
	return profile.name?.trim() || profile.displayName || profile.email?.split('@')[0] || '';
}
