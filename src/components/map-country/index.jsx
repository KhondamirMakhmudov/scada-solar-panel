import { useState, useEffect } from "react";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";
const MapOfUz = ({
  color = "#6635BC",
  markersData = [],
  onClickDelete,
  onClickEdit,
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [markers, setMarkers] = useState([]);

  const regionsData = {
    tashkent: { name: "Toshkent" },
    tashkentCity: { name: "Toshkent shahri" },
    samarkand: { name: "Samarqand" },
    navoi: { name: "Navoiy" },
    qashqadaryo: { name: "Qashqadaryo" },
    surxondaryo: { name: "Surxondaryo" },
    fargona: { name: "Farg'ona" },
    andijon: { name: "Andijon" },
    namangan: { name: "Namangan" },
    buxoro: { name: "Buxoro" },
    qoraqalpogiston: { name: "Qoraqalpog'iston Respublikasi" },
    xorazm: { name: "Xorazm" },
    sirdaryo: { name: "Sirdaryo" },
    jizzax: { name: "Jizzax" },
  };

  // Uzbekistan approximate bounds
  const UZ_BOUNDS = {
    minLat: 37.2,
    maxLat: 45.6,
    minLon: 56.0,
    maxLon: 73.2,
  };

  // SVG viewBox dimensions
  const SVG_WIDTH = 519;
  const SVG_HEIGHT = 333;

  // Convert lat/lon to SVG coordinates
  const latLonToSVG = (lat, lon) => {
    const x =
      ((lon - UZ_BOUNDS.minLon) / (UZ_BOUNDS.maxLon - UZ_BOUNDS.minLon)) *
      SVG_WIDTH;
    const y =
      ((UZ_BOUNDS.maxLat - lat) / (UZ_BOUNDS.maxLat - UZ_BOUNDS.minLat)) *
      SVG_HEIGHT;
    return { x, y };
  };

  useEffect(() => {
    if (markersData && markersData.length > 0) {
      const processedMarkers = markersData.map((item) => ({
        ...item,
        svgCoords: latLonToSVG(item.latitude, item.longitude),
      }));
      setMarkers(processedMarkers);
    }
  }, [markersData]);

  const handleMouseEnter = (regionKey, event) => {
    const region = regionsData[regionKey];
    if (region) {
      const { clientX, clientY } = event;
      setTooltip({
        name: region.name,
        x: clientX,
        y: clientY,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleMarkerEnter = (marker, event) => {
    const { clientX, clientY } = event;
    setTooltip({
      name: marker.name,
      address: marker.address,
      x: clientX,
      y: clientY,
      isMarker: true,
    });
  };

  const handleMarkerClick = (marker, event) => {
    event.stopPropagation();
    setSelectedMarker(marker);
    setTooltip(null);
  };

  return (
    <div className="grid grid-cols-12 gap-4 w-full h-full">
      <div className={`col-span-6 relative transition-all duration-300`}>
        {tooltip && (
          <div
            className="fixed bg-gray-800 text-white text-sm p-3 rounded-lg shadow-xl z-50 max-w-xs manrope"
            style={{
              top: tooltip.y + 10,
              left: tooltip.x + 10,
              pointerEvents: "none",
            }}
          >
            <p className="font-semibold">{tooltip.name}</p>
            {tooltip.address && (
              <p className="text-xs text-gray-300 mt-1">{tooltip.address}</p>
            )}
          </div>
        )}
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 519 333"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_397_16207)">
            <path
              id="Qoraqalpog'iston"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M0 24.6307V174.685L31.66 177.68C33.3864 172.689 33.5641 174.96 35.0367 172.514C34.5035 172.24 32.2439 172.115 31.4822 170.019C30.7206 167.922 31.7107 166.35 30.8475 163.605C30.162 161.459 29.248 161.11 29.248 158.614C29.248 156.917 29.832 154.023 30.0351 152.176C31.7869 151.203 34.9097 150.579 35.9761 148.333C37.8041 144.44 35.9761 144.864 39.886 142.418C42.2641 141.017 45.0757 140.503 47.8073 140.971C50.4767 141.661 53.3021 141.477 55.8556 140.447C57.5312 136.853 59.2323 137.402 59.0038 133.21C59.0038 130.889 58.4199 132.137 57.4805 129.841C60.0194 128.543 57.4805 130.54 60.6033 128.169C61.6443 127.371 61.238 126.248 64.1324 129.617C72.8408 128.194 70.2511 129.617 72.9677 135.581H76.776C75.2273 131.788 75.3796 136.604 71.3936 128.818C70.3019 126.697 70.6827 126.497 68.8547 125.274C66.6205 123.727 66.8236 124.8 65.4526 122.355C69.007 117.139 73.247 121.282 77.8932 120.907L79.4165 116.665C79.4165 116.266 78.9341 116.914 79.5688 115.492C82.5901 116.59 86.3476 125.1 91.2985 126.622C94.8529 127.72 97.4426 125.075 98.9151 129.517C100.819 135.93 100.743 130.515 104.526 135.83C108.729 136.474 113.005 136.516 117.221 135.955C117.601 135.955 117.982 136.13 118.642 136.679C119.302 137.228 120.953 138.925 121.714 139.723C121.156 141.395 120.927 140.322 120.166 141.894L122.705 143.691V147.335C120.978 148.058 121.74 147.335 120.343 148.408C121.74 150.03 122.654 150.155 123.974 151.652C126.995 150.504 129.23 147.384 133.063 146.96C138.141 146.361 138.471 150.454 139.791 154.122C141.112 157.791 141.111 155.62 143.752 157.267C147.306 159.488 141.619 158.689 150.226 165.053C151.525 166.322 153.228 167.115 155.05 167.299C155.507 170.992 155.253 170.193 158.808 172.29C164.419 175.634 157.741 174.136 163.301 179.277C166.563 180.449 168.071 180.746 172.296 183.417C174.064 185.397 179.566 189.18 181.65 190.837L194.174 184.393L174.498 150.704C176.783 148.208 180.947 146.511 183.359 144.165C181.15 137.402 180.82 140.297 181.708 131.688C182.318 125.274 181.911 124.076 184.527 118.686C187.903 111.649 191.813 104.437 194.682 97.5742C192.143 96.626 189.249 96.4762 186.812 95.6028C184.882 94.9041 185.364 95.1536 184.501 93.1073C184.019 91.8845 183.587 90.8614 183.079 89.6635C181.674 86.3913 179.58 83.4486 176.935 81.0291C176.021 80.0059 175.666 79.2822 174.726 78.284L156.37 57.3966C154.847 53.878 156.599 53.2541 153.07 50.9083L136.719 37.4326C134.891 35.8105 133.216 34.4131 131.337 32.9407C121.029 24.9551 126.538 26.9515 112.93 21.2867C100.235 16.0212 92.6187 10.3564 82.4631 2.29594C79.975 0.224668 79.8989 -0.723624 76.1667 0.648903C64.0816 4.99108 42.8311 11.2797 30.4667 14.9731C20.3111 18.1923 10.1556 21.8357 0 24.6307Z"
              onMouseEnter={(e) => handleMouseEnter("qoraqalpogiston", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Navoiy"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M186.482 94.28L196.637 96.5759C195.647 100.644 188.36 113.845 186.075 118.511C183.333 124.201 183.537 124.85 183.054 131.787C182.14 141.769 183.054 137.502 184.984 144.714C182.261 146.918 179.328 148.857 176.225 150.504C179.422 157.05 183.035 163.393 187.04 169.495L199.506 168.596C201.036 171.781 203.317 174.561 206.158 176.707C212.988 180.799 209.129 178.903 212.023 184.942L215.704 185.765C216.72 186.09 217.964 186.639 218.903 186.988C227.18 190.232 225.885 188.984 230.303 193.102C235.863 198.268 232.664 197.619 237.59 197.544L238.072 196.795L238.478 196.047C240.23 192.079 238.631 190.806 243.124 188.81C245.663 191.455 244.241 191.056 244.851 194.425L254.854 195.972L256.225 193.102L261.303 192.478C262.699 192.104 261.938 192.328 262.699 191.929L263.512 188.735C267.929 188.161 265.797 188.934 268.589 197.769C280.7 199.291 273.87 199.715 284.584 197.769L284.356 205.505C281.182 206.653 281.309 204.631 279.862 208C279.128 209.716 278.5 211.475 277.983 213.266C272.906 212.841 272.906 211.544 268.691 213.266C270.544 217.258 270.57 214.463 269.96 220.553L266.508 221.451C266.025 224.845 267.599 224.72 260.795 227.565C260.795 231.308 262.014 230.884 263.969 233.354C265.924 235.825 265.67 235.351 269.503 236.124C273.337 236.898 274.886 243.262 275.419 246.631L278.923 245.158C277.552 239.918 277.729 243.861 278.339 238.495C278.948 233.13 276.13 236.149 275.622 232.107C277.196 229.611 281.741 228.763 285.219 228.788L286.184 220.053C299.462 219.355 291.033 229.761 307.104 221.725C305.987 219.38 305.226 221.875 306.673 217.508C310.405 206.228 305.759 211.444 307.612 206.503C308.171 205.055 309.262 203.633 309.872 202.285C314.543 201.986 312.004 203.209 314.95 203.433C316.524 203.433 317.666 202.585 319.342 202.111L322.058 204.856L327.822 196.296C325.943 190.756 325.74 192.778 321.83 190.332L321.17 182.845L324.8 181.648C324.064 177.081 322.262 172.389 321.297 167.723C320.357 162.732 319.977 157.441 319.189 152.276L303.118 150.03V133.859H303.474L305.149 133.41L305.683 109.802L298.777 112.522C295.197 107.531 291.871 95.9271 287.301 92.9325C284.762 91.2355 279.507 88.6901 278.085 86.8185C270.646 77.1359 277.145 74.0415 263.156 81.3533C258.231 83.8488 259.221 83.6492 252.62 83.4745C244.445 83.225 236.904 82.3765 228.83 81.528C218.802 80.455 215.882 81.7776 206.488 83.7241C198.853 85.2921 191.101 86.2518 183.308 86.5939L186.482 94.28Z"
              onMouseEnter={(e) => handleMouseEnter("navoi", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Buxoro"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M200.05 171.936C200.05 171.761 199.39 171.012 199.288 170.913C199.013 170.501 198.698 170.117 198.349 169.765L187.685 170.738L195.556 185.012C190.099 187.869 187.685 188.166 182.556 192.024C186.78 198.257 192.56 202.156 188.523 206.074C189.92 207.746 190.808 207.846 191.951 209.094C192.106 210.415 192.448 211.708 192.966 212.937C193.551 213.98 193.807 215.17 193.703 216.356C194.109 224.192 193.449 226.512 198.273 229.457C209.1 236.174 219.495 243.542 229.399 251.517C230.669 252.59 230.872 252.59 231.938 253.414C234.477 255.56 231.05 254.512 243.617 263.621C244.475 264.493 245.518 265.169 246.673 265.6C247.827 266.032 249.063 266.208 250.294 266.116C257.911 265.941 252.579 261.125 268.904 258.954L267.33 255.51C269.509 252.682 271.884 250.005 274.439 247.5C270.58 231.953 269.361 241.311 263.294 234.573C262.506 233.724 261.313 232.477 260.425 231.404C259.786 230.814 259.402 230.005 259.355 229.145C259.308 228.285 259.6 227.44 260.171 226.787C261.212 225.614 262.938 225.689 264.106 224.641C265.68 223.243 264.665 223.094 265.401 220.598L268.752 219.475L268.981 215.832L266.442 213.336C273.424 210.042 269.133 211.664 276.978 212.063L279.695 205.276L283.249 204.577V199.786C279.695 199.935 279.847 200.834 275.633 200.21C272.865 199.811 270.225 199.536 267.508 199.012C267 197.34 266.645 195.942 266.264 194.295C265.096 189.13 265.35 190.677 264.334 189.953L263.471 193.721L256.921 194.495L255.778 197.639C238.006 195.443 244.836 195.967 242.881 190.677C239.58 191.625 240.926 195.119 238.616 198.962H233.081C232.243 197.989 232.421 197.54 231.608 196.467C227.292 190.402 215.283 186.485 211.297 187.108C208.453 181.344 211.297 181.568 205.585 178.075C201.776 175.479 202.563 175.579 200.05 171.936Z"
              onMouseEnter={(e) => handleMouseEnter("buxoro", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Qashqadaryo"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M277.678 283.764C280.572 285.635 283.238 287.108 285.853 288.755C289.992 291.25 287.961 292.174 294.562 293.197C299.233 293.945 297.278 292.373 299.817 292.548C301.874 292.723 300.427 293.396 304.133 294.644C312.207 297.339 309.719 297.14 312.334 299.635C315.33 302.555 315.025 299.935 322.033 302.131C323.404 297.913 330.284 291.001 335.59 288.231C336.631 282.142 334.955 284.013 339.119 280.295C341.053 278.39 342.819 276.328 344.4 274.131C347.498 274.73 349.986 275.978 348.564 271.636C347.371 267.992 346.609 268.691 348.208 264.823C351.052 264.149 354.276 265.072 353.87 261.504C353.515 258.409 351.052 257.885 348.792 257.336C343.715 256.114 344.806 255.29 342.547 254.242C341.049 253.568 337.469 252.745 335.743 252.221L334.245 254.516L328.862 253.992L328.456 249.675L323.023 248.802L320.992 251.672C315.533 251.846 315.406 249.7 311.217 251.123C308.251 252.609 304.88 253.125 301.594 252.595C297.278 242.937 293.775 246.256 291.134 246.456C289.382 246.456 286.92 246.456 285.117 246.456C272.423 246.132 275.774 249.925 268.868 254.641C269.071 257.137 269.681 256.962 270.366 259.258C264.171 262.901 257.215 261.005 254.219 267.443C261.099 271.586 253.66 269.939 270.62 277.849C274.682 279.796 274.2 281.468 277.678 283.764Z"
              onMouseEnter={(e) => handleMouseEnter("qashqadaryo", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Jizzax"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M382.459 232.331C387.537 232.456 388.197 233.429 388.527 229.412L390.05 231.383L392.107 229.911C391.675 228.339 391.243 228.613 390.38 227.241C389.883 226.385 389.556 225.445 389.415 224.47C394.112 223.248 393.985 222.923 394.493 221.226C390.101 219.28 384.109 225.269 379.691 221.775C380.352 220.128 380.631 221.002 382.51 219.604L382.129 216.31C374.512 216.31 381.443 218.307 365.118 216.834C365.728 214.339 368.089 209.348 368.216 207.576C368.368 205.33 367.048 205.08 367.809 202.585C368.19 201.387 369.13 199.79 369.637 198.343C368.673 197.312 367.492 196.5 366.177 195.961C364.862 195.423 363.444 195.171 362.021 195.223C362.909 191.106 362.478 193.601 365.448 191.929C366.286 188.785 366.362 189.958 365.448 186.938C365.88 186.464 366.794 185.74 366.819 185.591C366.845 185.441 368.038 184.992 366.058 184.443C363.519 183.694 366.058 184.592 362.96 185.865L362.782 181.648C359.913 181.099 360.244 181.997 357.298 181.049C350.773 178.977 349.682 182.471 342.497 182.197C336.784 181.997 325.918 180.525 322.186 184.218L322.82 189.209C326.248 191.705 325.968 188.186 329.218 196.321L323.15 205.729L331.173 207.351C331.173 211.169 330.082 213.216 330.665 215.187L331.046 215.986C332.113 217.882 332.671 216.36 332.544 219.579C332.544 221.476 331.986 221.326 332.24 223.622C335.18 225.675 338.589 226.986 342.167 227.44C348.514 228.937 348.336 227.59 348.945 234.253C344.934 235.725 343.588 236.748 342.344 242.488C349.072 245.333 344.35 243.91 350.469 241.615C362.072 237.272 360.624 243.661 369.409 243.312C373.979 243.137 374.487 244.185 379.564 243.91L382.357 239.693C381.545 236.998 380.91 238.495 381.469 236.224C381.926 234.961 382.257 233.657 382.459 232.331Z"
              onMouseEnter={(e) => handleMouseEnter("jizzax", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Surxondaryo"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M365.981 271.636C369.409 271.311 369.916 271.336 369.307 268.516C368.495 264.873 368.292 268.067 366.768 264.099C362.882 263.579 358.932 263.765 355.115 264.648L353.16 265.422C351.332 265.946 350.621 265.422 349.021 266.27C347.27 270.363 352.703 271.461 348.742 276.676L345.213 275.653C338.13 282.741 337.19 282.716 336.962 289.229C331.884 290.976 331.605 292.149 328.837 295.293C327.162 297.214 323.023 300.509 323.023 303.154C323.023 305.799 324.75 304.277 321.703 307.221C319.723 309.143 320.027 308.868 319.697 312.362C318.834 321.496 319.316 317.029 321.982 323.268C320.332 324.665 319.85 323.392 318.529 325.963L322.515 328.034C325.054 327.111 322.515 327.061 326.4 326.861C327.679 326.987 328.971 326.833 330.183 326.412C333.763 325.364 334.524 325.813 336.149 328.907C337.419 331.228 336.505 329.756 338.942 331.054C340.77 332.077 339.653 332.201 341.912 332.501C344.282 332.636 346.62 331.917 348.488 330.48C351.586 333.299 350.494 330.48 357.222 332.975C359.177 328.408 358.872 330.654 358.161 325.489C357.704 322.219 362.351 315.332 364.229 312.562C366.108 309.792 366.997 309.742 366.768 305.25C370.932 304.951 369.637 304.951 372.227 306.248C372.988 301.257 371.287 303.753 374.004 300.459C374.968 299.218 375.458 297.683 375.388 296.123C375.319 294.564 374.694 293.077 373.623 291.924C371.44 288.954 370.424 291.125 367.758 286.933C366.184 287.607 366.997 287.632 365.219 287.732C367.2 282.167 364.813 285.011 365.6 279.771C366.007 276.901 365.093 276.976 365.397 275.603C366.108 272.808 366.311 276.152 365.981 271.636Z"
              onMouseEnter={(e) => handleMouseEnter("surxondaryo", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Toshkent"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M429.606 167.648C429.124 166.949 428.26 169.045 429.174 165.502C429.758 163.256 435.598 162.607 438.39 158.714C439.279 157.491 439.051 156.867 440.142 155.57C441.234 154.272 441.463 154.547 442.453 153.498C443.443 152.45 443.494 151.702 444.992 151.003C446.49 150.304 448.064 150.679 448.749 150.279C450.933 149.056 448.317 149.156 449.968 146.686C450.806 145.413 451.517 145.937 453.167 145.987C456.188 145.987 456.264 144.19 458.575 142.668C460.453 141.42 464.592 141.146 462.078 138.451C460.242 137.151 458.2 136.156 456.036 135.506C453.827 138.226 454.36 136.504 451.618 138.001C450.679 138.451 450.882 138.75 449.638 139.249C447.835 139.973 447.556 138.251 444.712 143.217C440.269 151.028 441.691 144.34 438.619 143.442C437.019 143.242 436.08 144.589 433.998 145.263L434.176 149.156C428.286 149.93 433.871 151.203 427.245 154.147C419.4 157.741 429.784 156.643 415.007 160.062C412.468 160.661 412.214 160.062 411.25 162.308C409.98 165.127 411.25 164.404 408.203 165.227C406.629 165.676 405.233 165.402 406.781 168.571C404.115 168.571 403.582 169.22 402.338 169.07C400.637 168.821 401.983 166.874 395.636 171.89C391.294 175.334 397.235 176.881 392.665 179.851C381.621 187.063 385.734 184.143 386.419 187.512C382.027 189.833 384.312 191.081 388.628 195.348C390.796 197.715 393.252 199.81 395.94 201.587C395.94 207.701 397.921 207.102 396.524 212.991C396.143 214.563 398.174 219.829 402.643 217.982C402.897 215.087 403.354 217.259 401.424 215.262C402.135 214.688 403.785 214.264 403.963 213.64C403.305 210.645 402.184 207.766 400.637 205.105C401.777 204.401 402.985 203.808 404.242 203.334C404.242 200.314 404.039 194.45 408.584 195.373C411.605 195.997 410.767 199.94 414.83 201.587C418.689 199.54 415.007 199.59 420.821 198.343C422.117 198.111 423.378 197.726 424.579 197.195C426.991 196.047 425.823 196.296 427.118 195.248L433.059 192.353C435.598 191.206 435.826 189.858 435.598 186.714C440.549 184.493 438.543 184.218 436.182 178.079L434.811 175.11C436.816 171.815 436.867 174.086 438.39 171.291C437.544 169.514 436.022 168.134 434.15 167.448C431.002 165.726 432.043 168.097 429.606 167.648Z"
              onMouseEnter={(e) => handleMouseEnter("tashkent", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              onMouseEnter={(e) => handleMouseEnter("tashkentCity", e)}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer transition-all duration-200"
              fill={"#6635BC"}
              d="M401.5 171C399 172 399 175.5 399 175.5C399 175.5 400.609 177.718 402 177.5C402.965 177.349 403.488 176.831 404 176C404.422 175.314 404.5 174 404.5 174C405 172 402.33 170.668 401.5 171Z"
            />
            <path
              id="Samarqand"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M330.056 216.635C328.812 214.863 329.091 215.661 329.421 212.916C329.624 211.269 329.853 209.822 329.954 208.175C319.799 207.301 321.297 206.079 319.063 203.533C317.514 203.883 316.524 204.731 314.873 204.706C312.335 204.706 313.553 203.858 311.014 203.483C306.52 207.676 309.897 209.048 309.593 212.467C309.244 213.957 308.751 215.411 308.12 216.809C306.698 221.276 308.12 217.783 308.425 221.8C305.567 224.499 301.775 226.033 297.812 226.093C294.41 225.643 293.293 220.702 287.657 221.102L286.286 229.936C282.274 229.936 279.075 229.936 276.968 232.581C278.11 234.028 278.263 233.13 279.126 234.677C280.649 237.447 278.745 239.668 279.126 242.164L280.649 245.083C283.518 245.083 286.641 245.333 289.51 245.333C292.238 244.974 294.984 244.757 297.736 244.684C299.194 247.092 300.895 249.349 302.814 251.422C308.222 252.22 310.583 249.151 313.883 249.226C318.276 249.226 318.123 253.643 322.693 247.479L329.599 248.652C331.072 253.219 327.695 252.745 333.89 253.244C333.992 252.703 334.199 252.186 334.499 251.721C335.134 250.698 334.626 251.422 335.388 250.773C336.581 251.122 345.315 254.766 347.219 252.121C349.047 245.083 344.223 245.632 341.024 242.338C343.868 234.278 343.258 235.875 346.635 233.854C347.013 233.647 347.37 233.404 347.701 233.13C347.092 228.888 348.742 230.11 339.932 228.139C336.777 227.551 333.794 226.281 331.198 224.421C330.411 219.23 332.722 220.528 330.056 216.635Z"
              onMouseEnter={(e) => handleMouseEnter("samarkand", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Namangan"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M475.915 169.919C476.144 168.147 476.601 167.274 475.915 165.901C474.697 166.375 474.468 165.901 474.189 168.047C473.427 173.862 476.728 169.12 471.421 175.808L468.375 174.71C467.342 177.468 466.994 180.428 467.359 183.345C465.176 182.396 466.496 182.821 464.82 180.849C463.094 181.897 464.465 180.849 463.17 182.796L462.078 180.051C458.245 179.776 460.377 180.425 458.498 180.749C455.325 181.323 458.854 180.375 455.401 180.2C451.948 180.026 453.04 181.872 450.196 178.578C447.657 179.552 451.085 179.502 447.81 180.051C447.607 177.555 449.689 171.316 444.535 169.495C441.336 168.372 439.635 172.913 436.08 174.486C436.518 176.916 437.376 179.254 438.619 181.398C441.031 185.591 438.111 184.218 439.431 187.063L447.048 197.419L459.133 195.747L457.635 199.64L461.114 201.612C462.578 200.548 463.907 199.317 465.074 197.943C468.73 194.525 469.34 197.419 470.66 194.275C471.599 192.029 470.66 193.277 471.904 192.204C473.072 191.61 474.334 191.213 475.636 191.031C481.171 189.708 479.19 190.157 484.091 191.031C485.304 191.188 486.535 190.922 487.57 190.279C488.604 189.636 489.377 188.657 489.752 187.512C490.996 184.118 489.473 182.871 489.371 181.323C489.389 181.216 489.389 181.106 489.371 180.999C487.543 181.698 488.711 181.224 487.163 182.621C485.69 182.097 481.78 181.149 480.993 180.724C480.181 177.83 482.186 177.979 481.577 173.887C479.597 172.464 480.765 174.186 479.038 171.79C477.642 169.994 478.632 170.044 475.915 169.919Z"
              onMouseEnter={(e) => handleMouseEnter("namangan", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Farg'ona"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M449.612 218.082C454.689 217.284 452.557 218.082 454.182 215.013C458.574 215.013 456.467 214.414 459.463 212.817C463.372 211.918 471.472 217.558 472.716 217.808V217.209C473.249 215.387 473.401 215.736 475.254 215.861V220.353C476.507 220.222 477.661 219.623 478.479 218.681L480.358 216.71C480.358 216.535 480.535 216.51 480.637 216.41C484.014 217.882 482.389 216.41 485.334 215.487C485.334 213.815 484.902 215.137 484.09 212.767C486.375 211.319 486.273 210.895 487.873 208.924C490.234 205.904 490.412 208.924 490.691 204.906C487.949 203.458 483.328 203.883 480.535 202.735C478.174 201.811 479.52 200.863 477.463 199.865C475.809 199.43 474.094 199.261 472.385 199.366L470.608 196.721C466.038 197.769 464.21 200.788 461.773 203.384L456.187 200.364L457.254 197.195C454.644 197.397 452.05 197.755 449.485 198.268C446.59 198.917 441.614 203.558 439.507 205.754C438.11 207.227 439.202 206.478 436.968 207.451C430.189 210.296 437.476 212.068 441.589 212.442C441.259 217.783 440.751 215.412 443.087 218.931C445.169 218.781 447.403 218.456 449.612 218.082Z"
              onMouseEnter={(e) => handleMouseEnter("fargona", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Xorazm"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M159.95 177.929C158.985 176.033 159.696 175.883 158.96 174.535C157.665 172.04 155.532 173.812 153.882 170.343C152.536 167.523 154.39 169.295 151.521 167.848C148.575 166.381 146.046 164.221 144.158 161.559C141.771 155.819 141.898 159.538 139.359 157.017C138.364 154.879 137.515 152.678 136.82 150.429C134.282 145.687 126.462 150.828 125.446 152.924C127.985 155.57 128.924 153.249 130.524 157.317C128.391 156.718 126.157 155.42 124.126 155.919C123.288 160.186 126.157 160.486 126.284 163.406C126.411 166.325 123.745 165.277 123.745 170.468C130.778 174.411 133.139 179.976 139.842 177.954C144.919 176.507 146.621 177.605 151.216 177.954C153.755 178.129 152.13 176.257 154.948 177.954C159.188 180.674 154.263 180.974 162.082 181.074C161.441 179.981 160.729 178.931 159.95 177.929Z"
              onMouseEnter={(e) => handleMouseEnter("xorazm", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Andijon"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M504.859 203.533C507.956 203.683 506.408 204.132 507.956 201.637C509.505 199.141 507.956 201.412 509.886 199.64L510.698 198.792L510.952 198.517C513.745 195.797 517.502 197.145 518.975 195.173C518.975 194.799 519.762 192.678 515.421 193.651C508.362 195.198 515.116 193.476 502.726 192.653C501.152 190.157 503.132 190.956 499.705 188.111C499.045 187.562 499.705 188.236 498.867 187.312C498.029 186.389 498.74 186.664 497.471 185.94C492.571 183.12 490.108 189.509 490.082 189.533C486.604 195.448 480.739 188.785 472.082 193.526C471.625 196.296 471.574 196.022 473.046 198.268H478.277C480.13 202.685 484.015 202.186 491.961 203.458L491.682 207.826C493.688 208.549 495.109 209.897 497.369 210.72C498.334 205.904 497.521 207.925 496.963 206.628C496.125 204.631 497.928 206.178 495.566 202.685C499.299 202.535 496.531 202.41 498.232 203.608C499.83 205.088 501.906 205.971 504.097 206.104C504.453 205.48 504.097 206.104 504.554 204.956C504.656 204.881 504.833 203.658 504.859 203.533Z"
              onMouseEnter={(e) => handleMouseEnter("andijon", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            <path
              id="Sirdaryo"
              fillRule="evenodd"
              clipRule="evenodd"
              className="cursor-pointer transition-all duration-200"
              d="M391.853 200.289C389.111 198.168 383.931 193.901 383.195 190.457C382.23 185.915 382.84 188.411 381.494 186.065C378.955 186.988 379.082 186.24 377.99 188.311C379.539 189.733 380.529 189.035 380.834 190.931C381.139 192.828 379.996 192.653 380.834 195.922C381.033 196.752 381.386 197.539 381.875 198.243C384.642 202.46 380.91 199.69 383.119 203.109C377.229 204.582 375.147 200.863 370.755 199.166C367.911 204.881 369.536 202.51 369.358 207.651C369.358 209.573 367.226 213.416 366.819 215.761C375.325 216.859 376.467 214.988 383.17 214.838C383.881 221.301 383.424 218.382 387.359 218.981C391.294 219.58 386.318 217.883 397.058 217.858C395.839 215.362 394.773 216.485 395.026 213.815C395.483 208.824 396.829 214.963 394.62 203.459C394.214 201.637 393.021 201.163 391.853 200.289Z"
              onMouseEnter={(e) => handleMouseEnter("sirdaryo", e)}
              onMouseLeave={handleMouseLeave}
              fill={"#6635BC"}
            />
            {/* Render markers */}
            {markers.map((marker, index) => {
              const isSelected =
                selectedMarker?.id === marker.id ||
                (selectedMarker &&
                  !marker.id &&
                  markers.indexOf(marker) === markers.indexOf(selectedMarker));

              return (
                <g key={marker.id || index}>
                  {/* Marker pin */}
                  <circle
                    cx={marker.svgCoords.x}
                    cy={marker.svgCoords.y}
                    r={isSelected ? "7" : "5"}
                    fill={isSelected ? "#8B5CF6" : "#FF0000"}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200 manrope"
                    onMouseEnter={(e) => handleMarkerEnter(marker, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleMarkerClick(marker, e)}
                  />
                  {/* Animated pulse effect for selected marker */}
                  {isSelected && (
                    <circle
                      cx={marker.svgCoords.x}
                      cy={marker.svgCoords.y}
                      r="12"
                      fill="#8B5CF6"
                      opacity="0.4"
                      className="pointer-events-none"
                    >
                      <animate
                        attributeName="r"
                        from="7"
                        to="15"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6"
                        to="0"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  {/* Pin drop shadow */}
                  <circle
                    cx={marker.svgCoords.x}
                    cy={marker.svgCoords.y}
                    r={isSelected ? "10" : "8"}
                    fill={isSelected ? "#8B5CF6" : "#FF0000"}
                    opacity="0.3"
                    className="pointer-events-none transition-all duration-200"
                  />
                </g>
              );
            })}
          </g>
          <defs>
            <clipPath id="clip0_397_16207">
              <rect width="519" height="333" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
      {/* Details Panel */}
      {selectedMarker && (
        <div className="col-span-6 bg-[#1A132A] rounded-xl shadow-2xl overflow-hidden h-full manrope border border-[#2A1F3C] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <LocationOnIcon
                    className="text-white shrink-0"
                    fontSize="medium"
                  />
                  <h3 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {selectedMarker.name}
                  </h3>
                </div>
                {selectedMarker.address && (
                  <p className="text-purple-100 text-xs sm:text-sm ml-7 leading-snug truncate">
                    {selectedMarker.address}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedMarker(null)}
                className="text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-all duration-200"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div
            className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scroll-smooth"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            {/* Coordinates */}
            <div className="bg-[#0F0A1E] rounded-lg p-4 border border-[#2A1F3C] hover:border-[#8B5CF6]/50 transition">
              <h4 className="text-[#8B5CF6] text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wide">
                Координаты
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Широта</p>
                  <p className="text-[#E4E4E7] font-mono text-sm break-all">
                    {selectedMarker.latitude?.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Долгота</p>
                  <p className="text-[#E4E4E7] font-mono text-sm break-all">
                    {selectedMarker.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
            {/* DESCRIPTION */}
            {selectedMarker.description && (
              <div className="bg-[#0F0A1E] rounded-lg p-4 border border-[#2A1F3C] hover:border-[#8B5CF6]/50 transition">
                <h4 className="text-[#8B5CF6] text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wide">
                  Описание
                </h4>
                <p className="text-[#E4E4E7] text-sm sm:text-base leading-relaxed">
                  {selectedMarker.description}
                </p>
              </div>
            )}

            {/* CREATED AT */}
            {selectedMarker.created_at && (
              <div className="bg-[#0F0A1E] rounded-lg p-4 border border-[#2A1F3C] hover:border-[#8B5CF6]/50 transition">
                <h4 className="text-[#8B5CF6] text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wide">
                  Дата создания
                </h4>
                <p className="text-[#E4E4E7] text-sm sm:text-base leading-relaxed">
                  {new Date(selectedMarker.created_at).toLocaleString("ru-RU")}
                </p>
              </div>
            )}

            {/* UPDATED AT */}
            {selectedMarker.updated_at && (
              <div className="bg-[#0F0A1E] rounded-lg p-4 border border-[#2A1F3C] hover:border-[#8B5CF6]/50 transition">
                <h4 className="text-[#8B5CF6] text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wide">
                  Дата обновления
                </h4>
                <p className="text-[#E4E4E7] text-sm sm:text-base leading-relaxed">
                  {new Date(selectedMarker.updated_at).toLocaleString("ru-RU")}
                </p>
              </div>
            )}

            {/* CONNECTS */}
            {selectedMarker.connect && selectedMarker.connect.length > 0 && (
              <div className="bg-[#0F0A1E] rounded-lg p-4 border border-[#2A1F3C] hover:border-[#8B5CF6]/50 transition">
                <h4 className="text-[#8B5CF6] text-xs sm:text-sm font-semibold mb-3 uppercase tracking-wide">
                  Подключения
                </h4>

                <div className="space-y-3">
                  {selectedMarker.connect.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-lg bg-[#161122] border border-[#2A1F3C] hover:border-[#8B5CF6]/40 transition"
                    >
                      <p className="text-[#E4E4E7] text-sm mb-2">
                        <strong className="text-[#8B5CF6]">Название:</strong>{" "}
                        {item.name}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-1">
                          <p className="text-[#A1A1AA] text-xs">IP-адрес</p>
                          <p className="text-[#E4E4E7] font-mono text-sm break-all">
                            {item.ip}
                          </p>
                        </div>

                        <div className="col-span-1">
                          <p className="text-[#A1A1AA] text-xs">Порт</p>
                          <p className="text-[#E4E4E7] text-sm font-mono">
                            {item.port}
                          </p>
                        </div>

                        <div className="col-span-1 mt-3">
                          <p className="text-[#A1A1AA] text-xs">Логин</p>
                          <p className="text-[#E4E4E7] font-mono text-sm break-all">
                            {item.username}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-[#A1A1AA] text-xs">Пароль</p>
                          <p className="text-[#E4E4E7] font-mono text-sm break-all">
                            {item.password}
                          </p>
                        </div>
                      </div>

                      <p className="text-[#A1A1AA] text-xs mt-3">
                        Дата подключения:
                      </p>
                      <p className="text-[#E4E4E7] text-xs">
                        {new Date(item.created_at).toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {Object.keys(selectedMarker).filter(
              (key) =>
                ![
                  "svgCoords",
                  "latitude",
                  "longitude",
                  "name",
                  "address",
                  "id",
                ].includes(key)
            ).length === 0 && (
              <div className="text-center py-8">
                <LocationOnIcon
                  className="text-[#2A1F3C] mx-auto mb-3"
                  style={{ fontSize: 48 }}
                />
                <p className="text-[#A1A1AA] text-sm">
                  Дополнительная информация отсутствует
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-[#120C22] border-t border-[#2A1F3C] px-4 sm:px-6 py-4 flex justify-end gap-2 sm:gap-3">
            <button
              onClick={() => onClickEdit(selectedMarker.id)}
              className="!w-auto !h-8 sm:!h-10 px-3 hover:bg-[#d1651d] bg-[#FF6200] text-white rounded-md text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              Изменить
            </button>
            <button
              onClick={() => onClickDelete(selectedMarker.id)}
              className="!w-auto !h-8 sm:!h-10 px-3 text-white hover:bg-[#d62912] bg-[#FF1E00] rounded-md text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapOfUz;
