import type { MetadataRoute } from "next";

/** Mini App should not be indexed by search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
