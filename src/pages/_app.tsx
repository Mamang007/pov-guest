import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Theme theme={neutralTheme}>
      <Component {...pageProps} />
    </Theme>
  );
}
