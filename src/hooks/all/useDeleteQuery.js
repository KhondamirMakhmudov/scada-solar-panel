import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPython } from "@/services/api";
import { toast } from "react-hot-toast";
import { isArray, get, forEach, isObject, values } from "lodash";

const useDeleteQuery = ({
  hideSuccessToast = false,
  hideErrorToast = false,
  listKeyId = null,
  apiClient = requestPython,
}) => {
  const deleteRequest = (url, config = {}) =>
    apiClient.delete(url, {
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      ...config,
    });

  const queryClient = useQueryClient();

  const { mutate, isPending, isError, error, isFetching } = useMutation({
    mutationFn: ({ url, config = {} }) => deleteRequest(url, config),
    onSuccess: (data) => {
      if (!hideSuccessToast) {
        toast.success(data?.data?.message || "Deleted successfully");
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
        if (!hideErrorToast) {
          toast.error(data?.response?.data?.message || "ERROR");
        }
      } else {
        if (!hideErrorToast) {
          toast.error(data?.response?.data?.message || "ERROR");
        }
      }
    },
  });

  return {
    mutate,
    isPending,
    isError,
    error,
    isFetching,
  };
};

export default useDeleteQuery;
