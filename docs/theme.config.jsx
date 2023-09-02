import logoUrl from "../Logo.png";

export default {
  logo: (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <img src={logoUrl.src} width="32px" height="32px" />
      <b style={{ fontSize: "24px" }}>xSuite.js</b>
    </div>
  ),
  project: {
    link: "https://github.com/arda-org/xSuite.js",
  },
  docsRepositoryBase: "https://github.com/arda-org/xSuite.js/tree/main/docs",
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
};
