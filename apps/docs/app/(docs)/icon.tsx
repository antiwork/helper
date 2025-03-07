import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg width="110" height="32" viewBox="0 0 110 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clip-path="url(#clip0_87_328)">
      <path d="M15.6445 17.5863C13.1883 15.0779 23.7323 7.99678 23.7323 7.99678L21.0385 4.26697C21.0385 4.26697 16.9095 7.67863 13.8541 11.6518C13.2063 12.5479 11.9349 11.8086 12.7039 10.5377C14.5991 7.40511 20.0893 2.33908 20.0893 2.33908L15.9176 0.34222C15.9176 0.34222 13.1998 2.97064 9.77521 9.56398C9.14895 10.7696 7.87513 10.1591 8.30827 8.91668C9.41671 5.7372 13.012 0.682514 13.012 0.682514L8.64253 0C8.64253 0 6.28571 4.09417 4.82106 9.18297C4.50784 10.2708 3.14382 10.0118 3.30592 8.93104C3.58657 7.05969 5.53001 1.64641 5.53001 1.64641L1.75098 1.66197C1.75098 1.66197 -1.48056 8.90223 0.905913 16.8887C2.2649 21.4366 6.51806 25.9384 12.0685 25.9384C17.5114 25.9384 22.2747 21.9178 23.896 15.7162L20.121 12.9706C20.121 12.9706 18.0169 20.0092 15.6445 17.5863Z" fill="#FEB81D"/>
      </g>
      <defs>
      <clipPath id="clip0_87_328">
      <rect width="110" height="32" fill="white"/>
      </clipPath>
      </defs>
      </svg>
    ),
    {
      ...size,
    }
  );
}