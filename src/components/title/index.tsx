import { ReactNode } from "react";

interface TitleProps {
  children: ReactNode;
}

const Title = ({ children }: TitleProps) => {
  return (
    <h2 className="text-lg font-semibold text-white truncate">{children}</h2>
  );
};

export default Title;
