import { toast } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../services/api"; // kerakli path bo'yicha moslashtir

// PUT so‘rovni yuboruvchi funksiya
const putRequest = (url, attributes, config = {}) =>
  request.put(url, attributes, {
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}), // qo‘shimcha headerlar
    },
    ...config,
  });

const usePutQuery = ({
  hideSuccessToast = false,
  hideErrorToast = false,
  listKeyId = null,
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading, isError, error, isFetching } = useMutation(
    ({ url, attributes, config = {} }) => putRequest(url, attributes, config),
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
          toast.error(data?.response?.data?.message || "ERROR");
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

export default usePutQuery;
