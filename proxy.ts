import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  // Only protect the Members and Admin sections.
  // The root path '/' is NOT included here, making it public.
  matcher: ["/members/:path*", "/admin/:path*"],
};
