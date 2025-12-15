import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

const ClientOnlyToaster = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? (
    <Toaster position="top-right" reverseOrder={false} />
  ) : null;
};

export default ClientOnlyToaster;
