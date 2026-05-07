export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type CreateUserInput = Pick<User, "name" | "email">;
export type UpdateUserInput = Partial<CreateUserInput>;
export type ListUsersParams = { page?: number; pageSize?: number; q?: string };
