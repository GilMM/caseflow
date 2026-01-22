import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["https://madrigalian-mindy-lolly.ngrok-free.dev"],
};

export default withNextIntl(nextConfig);
