import { request } from "@/services/third-party-facade";
import type {
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
  User,
} from "./types";

const RESOURCE = "/users";

export const usersApi = {
  list: (params?: ListUsersParams) =>
    request<User[]>({ method: "GET", url: RESOURCE, params }),
  get: (id: string) =>
    request<User>({ method: "GET", url: `${RESOURCE}/${id}` }),
  create: (input: CreateUserInput) =>
    request<User>({ method: "POST", url: RESOURCE, data: input }),
  update: (id: string, input: UpdateUserInput) =>
    request<User>({ method: "PATCH", url: `${RESOURCE}/${id}`, data: input }),
  remove: (id: string) =>
    request<void>({ method: "DELETE", url: `${RESOURCE}/${id}` }),
};
