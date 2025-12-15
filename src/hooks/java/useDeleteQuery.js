import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../services/api";
import { toast } from "react-hot-toast";
import { isArray, get, forEach, isObject, values } from "lodash";

// DELETE so‘rovni yuboruvchi funksiya
const deleteRequest = (url, config = {}) =>
  request.delete(url, {
    headers: {
      "Content-Type": "application/json", // default header
      ...(config.headers || {}), // custom header qo‘shish
    },
    ...config,
  });

const useDeleteQuery = ({
  hideSuccessToast = false,
  hideErrorToast = false,
  listKeyId = null,
}) => {
  const queryClient = useQueryClient();

  const { mutate, isLoading, isError, error, isFetching } = useMutation(
    ({ url, config = {} }) => deleteRequest(url, config),
    {
      onSuccess: (data) => {
        if (!hideSuccessToast) {
          toast.success(data?.data?.message || "Deleted successfully");
        }

        if (listKeyId) {
          if (isArray(listKeyId)) {
            forEach(listKeyId, (key) => {
              queryClient.invalidateQueries(key);
            });
          } else {
            queryClient.invalidateQueries(listKeyId);
          }
        }
      },
      onError: (data) => {
        if (isArray(get(data, "response.data"))) {
          forEach(get(data, "response.data"), (val) => {
            toast.error(get(val, "message", "ERROR"));
          });
        } else if (isObject(get(data, "response.data"))) {
          // Qo‘shimcha errorlarni ko‘rsatish uchun uncomment qilsa bo‘ladi
          // forEach(values(get(data, "response.data")), (val) => {
          //   toast.error(val);
          // });
        } else {
          if (!hideErrorToast) {
            toast.error(data?.response?.data?.message || "ERROR");
          }
        }
      },
    }
  );

  return {
    mutate, // delete qilish uchun chaqiriladi
    isLoading, // true bo‘ladi so‘rov vaqtida
    isError, // error chiqsa true
    error, // xatolik obyekti
    isFetching, // optional: fetch bo‘layotganini bildiradi
  };
};

export default useDeleteQuery;
