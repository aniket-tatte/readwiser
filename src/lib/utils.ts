import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Metadata } from "next";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string) {
  if (typeof window !== "undefined") return path;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}${path}`;
  return `http://localhost:${process.env.PORT ?? 3000}${path}`;
}

export function constructMetadata({
  title = "ReadWiser - Be wise with how you read",
  description = "Empower your document interaction with ReadWiser! Upload PDF files, ask questions, and engage in insightful conversations directly within your documents. Experience seamless collaboration and understanding like never before. Join our platform for a transformative document experience.",
  image = "/thumbnail.png",
  icons = "/favicon.ico",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    keywords: [
      "PDF",
      "chat with pdf documents",
      "Google Gemini AI",
      "intelligent chat",
      "upload PDF",
      "interactive documents",
      "generative AI",
    ],
    authors: {
      url: new URL("https://www.linkedin.com/in/aniket-tatte/"),
      name: "Aniket Tatte",
    },
    icons,
    metadataBase: new URL("https://readwiser.vercel.app"),
    themeColor: "#FFF",
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}