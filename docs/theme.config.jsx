import { useRouter } from "next/router";
import logoUrl from "../Logo.png";

export const websiteName = "xSuite";

export default {
  logo: (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <img src={logoUrl.src} width="32" height="32" />
      <b style={{ fontSize: "24px" }}>{websiteName}</b>
    </div>
  ),
  project: {
    link: "https://github.com/arda-org/xSuite",
  },
  chat: {
    link: "https://t.me/xSuite_js",
    icon: (
      <svg fill="#FFFFFF" viewBox="0 0 50 50" width="24" height="24">
        <path d="M46.137,6.552c-0.75-0.636-1.928-0.727-3.146-0.238l-0.002,0C41.708,6.828,6.728,21.832,5.304,22.445	c-0.259,0.09-2.521,0.934-2.288,2.814c0.208,1.695,2.026,2.397,2.248,2.478l8.893,3.045c0.59,1.964,2.765,9.21,3.246,10.758	c0.3,0.965,0.789,2.233,1.646,2.494c0.752,0.29,1.5,0.025,1.984-0.355l5.437-5.043l8.777,6.845l0.209,0.125	c0.596,0.264,1.167,0.396,1.712,0.396c0.421,0,0.825-0.079,1.211-0.237c1.315-0.54,1.841-1.793,1.896-1.935l6.556-34.077	C47.231,7.933,46.675,7.007,46.137,6.552z M22,32l-3,8l-3-10l23-17L22,32z" />
      </svg>
    ),
  },
  docsRepositoryBase: "https://github.com/arda-org/xSuite/tree/dev/docs",
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://arda.run" target="_blank">
          Arda
        </a>
        .
      </span>
    ),
  },
  useNextSeoProps() {
    const { asPath } = useRouter();
    if (asPath !== "/") {
      return {
        titleTemplate: `%s – ${websiteName}`,
      };
    }
    return {
      titleTemplate: websiteName,
    };
  },
};
