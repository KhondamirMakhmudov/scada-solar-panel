import axios from "axios";
import { signOut } from "next-auth/react";
import { config } from "@/config";

let isSigningOut = false;

const handleAuthError = (error) => {
  if (
    error?.response?.status === 401 &&
    typeof window !== "undefined" &&
    !isSigningOut
  ) {
    isSigningOut = true;
    signOut({ callbackUrl: "/" });
  }
  return Promise.reject(error);
};

const request = axios.create({
  baseURL: config.JAVA_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

request.interceptors.response.use((response) => response, handleAuthError);

const requestPython = axios.create({
  baseURL: config.PYTHON_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

requestPython.interceptors.response.use(
  (response) => response,
  handleAuthError,
);

const requestScreens = axios.create({
  baseURL: config.SCREENS_API_URL,
  params: {},
  headers: {
    common: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
  },
});

requestScreens.interceptors.response.use(
  (response) => response,
  handleAuthError,
);

export { request, requestPython, requestScreens };
