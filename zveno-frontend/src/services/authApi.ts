import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000", // если backend на другом порту — поменяй
});

export async function login(payload: {
  email: string;
  password: string;
}) {
  const { data } = await api.post("/auth/login", payload);
  return data;
}

export async function register(payload: {
  email: string;
  username: string;
  password: string;
}) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}
