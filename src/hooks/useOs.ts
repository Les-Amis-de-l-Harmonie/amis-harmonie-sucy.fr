import { useEffect, useState } from "react";

// how to use
// const macOS = useOs()
// returns true/false

const useOs = (): boolean => {
  // get Os
  const [os, setOs] = useState<boolean>(false);
  useEffect(() => {
    setOs(navigator.platform.indexOf("Mac") > -1);
  }, []);

  return os;
};

export default useOs;
