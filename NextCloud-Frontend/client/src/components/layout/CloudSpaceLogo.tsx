export function CloudSpaceLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 24C4.68629 24 2 21.3137 2 18C2 15.2386 3.87973 12.9195 6.40884 12.2166C6.14302 11.5306 6 10.7828 6 10C6 6.68629 8.68629 4 12 4C14.3726 4 16.4289 5.36576 17.4149 7.3644C18.1393 7.12998 18.9143 7 19.72 7C24.0267 7 27.52 10.4933 27.52 14.8C27.52 15.0267 27.512 15.2513 27.4963 15.4737C29.5049 16.2817 30.92 18.2603 30.92 20.56C30.92 23.5643 28.4843 26 25.48 26H8Z"
        fill="#4F46E5"
      />
      <path
        d="M12 18L15 15L18 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 15V23"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
