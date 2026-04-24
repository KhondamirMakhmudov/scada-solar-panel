import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPython } from "@/services/api";
import { toast } from "react-hot-toast";
import { isArray, get, forEach, isObject, values } from "lodash";

const usePostQuery = ({
  hideSuccessToast = false,
  listKeyId = null,
  hideErrorToast = false,
  apiClient = requestPython, // ✅ Accept apiClient as parameter
}) => {
  // ✅ Modified postRequest to allow merging default and custom headers
  const postRequest = (url, attributes, config = {}) =>
    apiClient.post(url, attributes, {
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      ...config,
    });
  const queryClient = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: ({ url, attributes, config = {} }) =>
      postRequest(url, attributes, config),
    onSuccess: (data) => {
      if (!hideSuccessToast) {
        toast.success(data?.data?.message || "SUCCESS");
      }

      if (listKeyId) {
        if (isArray(listKeyId)) {
          forEach(listKeyId, (val) => {
            queryClient.invalidateQueries({ queryKey: [val] });
          });
        } else {
          queryClient.invalidateQueries({ queryKey: [listKeyId] });
        }
      }
    },
    onError: (data) => {
      if (isArray(get(data, "response.data"))) {
        forEach(get(data, "response.data"), (val) => {
          toast.error(get(val, "message", "ERROR"));
        });
      } else if (isObject(get(data, "response.data"))) {
        // Uncomment if needed
        // forEach(values(get(data, "response.data")), (val) => {
        //   toast.error(val, { position: "top-right" });
        // });
      } else {
        if (!hideErrorToast) {
          toast.error(data?.response?.data?.message || "ERROR");
        }
      }
    },
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    error,
  };
};

export default usePostQuery;
