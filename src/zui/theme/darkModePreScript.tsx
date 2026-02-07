export const DarkModePreScript = () => {
  return (
    <script
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  if (typeof localStorage === "undefined" || typeof window === "undefined")
    return;
  
  const storedDarkMode = localStorage.getItem("theme-mode");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

  if (storedDarkMode !== "light" && (storedDarkMode === "dark" || (storedDarkMode === "auto" && prefersDark) || (!storedDarkMode && prefersDark))) {
    document.documentElement.style.backgroundColor = "#151515";
  }
})();
        `,
      }}
    />
  );
};
