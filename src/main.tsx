import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const THEME_STORAGE_KEY = "glrsdac-theme";

const resolveInitialTheme = () => {
	const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
	if (saved === "dark" || saved === "light") return saved;
	return "light";
};

const initialTheme = resolveInitialTheme();
document.documentElement.classList.toggle("dark", initialTheme === "dark");

createRoot(document.getElementById("root")!).render(<App />);
