import { toast } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestPython } from "@/services/api";
import { translateApiError } from "@/lib/apiErrorTranslation";

// PATCH so‘rovni yuboruvchi funksiya
const patchRequest = (url, attributes, config = {}) =>
  requestPython.patch(url, attributes, {
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    },
    ...config,
  });

const usePatchPythonQuery = ({
  hideSuccessToast = false,
  hideErrorToast = false,
  listKeyId = null,
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading, isError, error, isFetching } = useMutation(
    ({ url, attributes, config = {} }) => patchRequest(url, attributes, config),
    {
      onSuccess: (data) => {
        if (!hideSuccessToast) {
          toast.success(data?.data?.message || "SUCCESS");
        }

        if (listKeyId) {
          queryClient.invalidateQueries(listKeyId);
        }
      },
      onError: (data) => {
        if (!hideErrorToast) {
          toast.error(translateApiError(data?.response?.data?.message) || "ERROR");
        }
      },
    }
  );

  return {
    mutate,
    isLoading,
    isError,
    error,
    isFetching,
  };
};

export default usePatchPythonQuery;
