import { z } from 'zod';

export const BaseUserSchema = z.object({
  id: z.string(),
});

export type BaseUser = z.infer<typeof BaseUserSchema>;

export interface User extends BaseUser {
  id: string;
}

export type TrustShowcaseAvatarDto = {
  id: string;
  url: string;
};

export type TrustShowcaseDto = {
  avatars: TrustShowcaseAvatarDto[];
  tutor: number;
};
